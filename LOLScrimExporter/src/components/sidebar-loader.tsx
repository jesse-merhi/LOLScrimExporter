import { graphqlQuery, graphqlVariables } from "@/lib/constants";
import { useState } from "react";
import MoonLoader from "react-spinners/MoonLoader";
import InfiniteScroll from "./ui/infinite-scroll";

// Type for a single player
export interface Player {
  id: string;
  name: string;
  character?: {
    id: string;
    name: string;
  };
}

// Filter
// - Per TEAM
// - Losses? Wins?
// - Champions
// - Filter based on bans?
// - Start Date, end date
// - ASC DESC

// Other Things to do
// - Draft Order + Bans
// UI/UX
// Downloadable Files
// Date

// Type for a game
export interface Game {
  teams: {
    id: string;
    players: Player[];
  }[];
}

// Type for a single series state
export interface SeriesState {
  title: {
    nameShortened: string;
  };
  finished: boolean;
  teams: {
    id: string;
    score: number;
    players: Player[];
  }[];
  games: Game[];
}

// Type for the series details response
export interface SeriesDetailsResponse {
  data: {
    seriesState: SeriesState;
  };
}
function SidebarLoader(props: {
  authToken: string;
  setGameLoading: (gameLoading: boolean) => void;
  setSelectedGame: (id: string | null) => void;
  setScores: (scores: number[]) => void;
  setAuthToken: (authToken: string | null) => void;
}) {
  const authToken = props.authToken;
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [seriesDetails, setSeriesDetails] = useState<Record<
    string,
    SeriesState
  > | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const clearTokens = () => {
    localStorage.removeItem("authToken");
    props.setAuthToken(null);
    localStorage.removeItem("refreshToken");
    document.location.reload();
  };
  const fetchSeries = async () => {
    console.log("FGETCHING");
    try {
      setIsFetching(true);

      const response = await fetch("https://api.grid.gg/central-data/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationName: "GetHistoricalSeries",
          variables: {
            ...graphqlVariables,
            after: endCursor,
          },
          query: graphqlQuery,
        }),
      });

      if (response.status == 401) {
        setIsFetching(false);
        clearTokens();
      }
      if (!response.ok) {
        console.error(
          "Failed to fetch historical series:",
          response.statusText
        );
        setIsFetching(false);
        return;
      }

      const historicalData = await response.json();
      console.log(historicalData);
      if (
        !(
          historicalData &&
          historicalData.data &&
          historicalData.data.allSeries
        )
      ) {
        setIsFetching(false);
        clearTokens();
        return;
      }
      const { edges: seriesEdges, pageInfo } = historicalData.data.allSeries;

      const seriesIds = seriesEdges.map(
        (edge: { node: { id: number } }) => edge.node.id
      );

      if (seriesIds.length === 0) {
        console.warn("No series found in the historical data.");
        setIsFetching(false);
        return;
      }

      // Fetch series details
      const seriesDetailsPromises = seriesIds.map(async (id: number) => {
        const detailResponse = await fetch(
          "https://api.grid.gg/live-data-feed/series-state/graphql",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              operationName: "GetSeriesPlayersAndResults",
              variables: { id },
              query: `
                  query GetSeriesPlayersAndResults($id: ID!) {
                    seriesState(id: $id) {
                      title {
                        nameShortened
                      }
                      finished
                      teams {
                        id
                        score
                        players {
                          id
                          name
                        }
                      }
                    }
                  }
                `,
            }),
          }
        );
        if (detailResponse.status == 401) {
          setIsFetching(false);
          props.setAuthToken(null);
        }

        if (!detailResponse.ok) {
          console.error(
            `Failed to fetch details for series ID ${id}:`,
            detailResponse.statusText
          );
          return null;
        }

        const data: SeriesDetailsResponse = await detailResponse.json();
        return { [id]: data.data.seriesState };
      });

      const resolvedSeriesDetails = await Promise.all(seriesDetailsPromises);
      const validSeriesDetails = resolvedSeriesDetails.filter(
        (detail) => detail !== null
      );

      // Update state
      setSeriesData((prevData) => [...prevData, ...seriesEdges]);
      setSeriesDetails((prevDetails) => ({
        ...prevDetails,
        ...Object.assign({}, ...validSeriesDetails),
      }));

      setHasMore(pageInfo.hasNextPage);
      setEndCursor(pageInfo.endCursor);
      setIsFetching(false);
    } catch (error) {
      console.error("Error fetching series:", error);
      setIsFetching(false);
    }
  };

  return (
    <InfiniteScroll
      isLoading={isFetching}
      hasMore={hasMore}
      next={() => fetchSeries()}
      threshold={0}
    >
      {seriesDetails &&
        seriesData.map((edge) => {
          const { node } = edge;
          console.log(node);
          const teams = node.teams;
          const team1Score = seriesDetails[node.id]?.teams[0]?.score ?? 0;
          const team2Score = seriesDetails[node.id]?.teams[1]?.score ?? 0;
          return (
            <div
              className=" w-full border-b-2 text-accent flex-col flex justify-center items-center p-2 cursor-pointer hover:bg-slate-800"
              key={node.id}
              onClick={() => {
                props.setSelectedGame(node.id);
                props.setGameLoading(true);
                props.setScores([team1Score, team2Score]);
              }}
            >
              <div>
                {new Date(node.startTimeScheduled).toLocaleString("en", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </div>
              <div className="h-12 w-full text-accent flex justify-center items-center p-2 cursor-pointer hover:bg-slate-800">
                <img
                  src={teams[0].baseInfo.logoUrl}
                  className="h-full"
                  alt="Team 1"
                />
                <div>
                  {team1Score} x {team2Score}
                </div>
                <img
                  src={teams[1].baseInfo.logoUrl}
                  className="h-full"
                  alt="Team 2"
                />
              </div>
            </div>
          );
        })}
      {hasMore && (
        <div className="h-12 w-full  text-accent flex justify-center items-center p-2">
          <MoonLoader size={25} color="white" />
        </div>
      )}
    </InfiniteScroll>
  );
}

export default SidebarLoader;
