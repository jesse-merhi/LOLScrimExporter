import { getAuthToken } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";

export interface Draft {
  bans1Blue: string[];
  bans1Red: string[];
  picks1Blue: string[];
  picks1Red: string[];
  picks2Blue: string[];
  picks2Red: string[];
  picks3Blue: string[];
  picks3Red: string[];
  picks4Blue: string[];
  picks4Red: string[];
  bans2Blue: string[];
  bans2Red: string[];
}

export interface EventData {
  events: {
    edges: DraftLog[];
  };
}

const DEFAULT_DRAFT: Draft = {
  bans1Blue: [],
  bans1Red: [],
  picks1Blue: [],
  picks1Red: [],
  picks2Blue: [],
  picks2Red: [],
  picks3Blue: [],
  picks3Red: [],
  picks4Blue: [],
  picks4Red: [],
  bans2Blue: [],
  bans2Red: [],
};

export interface DraftLog {
  node: DraftNode;
}

export interface DraftNode {
  type: string;
  sentenceChunks: SentenceChunk[];
}

export interface SentenceChunk {
  text: string;
  strikethrough: boolean;
}

function Draft({ selectedGame }: { selectedGame: string }) {
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);

  const fetchEventLog = async () => {
    const authToken = getAuthToken();
    if (!authToken) {
      console.error("No auth token, please log in first.");
      return;
    }
    const response = await fetch(
      "https://lol.grid.gg/api/event-explorer-api/events/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          operationName: "getSeriesEvents",
          variables: {
            id: selectedGame,
            filter: {
              event: [
                { type: { eq: "team-banned-character" } },
                { type: { eq: "team-picked-character" } },
                { type: { eq: "grid-validated-series" } },
              ],
            },
          },
          query: `query getSeriesEvents($id: String!, $filter: EventsFilter, $after: Cursor) {
            events(seriesId: $id, filter: $filter, after: $after) {
              edges {
                node {
                  type
                  sentenceChunks {
                    text
                    strikethrough
                  }
                }
              }
            }
          }`,
        }),
      }
    );

    if (!response.ok) {
      console.error("Request failed:", response.statusText);
      return;
    }

    const data = await response.json();
    const events: EventData = data.data;
    const validated =
      events.events.edges.findIndex(
        (element) => element.node.type === "grid-validated-series"
      ) + 1;
    const validatedData = data.data.events.edges.slice(validated);
    console.log(validatedData);
    console.log("FOUND", validatedData);

    const parsedDraft = parseDraftOrder(validatedData);

    setDraft(parsedDraft);
  };

  function parseDraftOrder(draftLog: DraftLog[]) {
    const draft: Draft = {
      bans1Blue: [],
      bans1Red: [],
      picks1Blue: [],
      picks1Red: [],
      picks2Blue: [],
      picks2Red: [],
      picks3Blue: [],
      picks3Red: [],
      picks4Blue: [],
      picks4Red: [],
      bans2Blue: [],
      bans2Red: [],
    };

    let blueTeam = "";
    let redTeam = "";
    let pickOrder = [
      { team: "blue", picks: 1 },
      { team: "red", picks: 2 },
      { team: "blue", picks: 2 },
      { team: "red", picks: 1 },
      { team: "red", picks: 1 },
      { team: "blue", picks: 2 },
      { team: "red", picks: 1 },
    ];
    let pickStage = 0;
    let bluePickIndex = 1;
    let redPickIndex = 1;

    draftLog.forEach((e) => {
      console.log(e);
      const [team, action, champion] = e.node.sentenceChunks.map(
        (chunk) => chunk.text
      );
      console.log(team, action, champion);

      if (!blueTeam || !redTeam) {
        if (!blueTeam) blueTeam = team;
        else if (team !== blueTeam && !redTeam) redTeam = team;
      }

      if (action === "banned") {
        if (team === blueTeam && draft.bans1Blue.length < 3) {
          draft.bans1Blue.push(champion);
        } else if (team === redTeam && draft.bans1Red.length < 3) {
          draft.bans1Red.push(champion);
        } else if (team === blueTeam) {
          draft.bans2Blue.push(champion);
        } else {
          draft.bans2Red.push(champion);
        }
      } else if (action === "picked") {
        const currentPick = pickOrder[pickStage];
        console.log(currentPick, pickStage);
        if (
          (team === blueTeam && currentPick.team === "blue") ||
          (team === redTeam && currentPick.team === "red")
        ) {
          if (currentPick.team === "blue") {
            const key = `picks${bluePickIndex}Blue` as keyof Draft;
            draft[key].push(champion);
            if (draft[key].length >= currentPick.picks) {
              bluePickIndex++;
              pickStage++;
            }
          } else {
            const key = `picks${redPickIndex}Red` as keyof Draft;
            draft[key].push(champion);
            if (draft[key].length >= currentPick.picks) {
              redPickIndex++;
              pickStage++;
            }
          }
        }
      }
    });

    return draft;
  }

  useEffect(() => {
    fetchEventLog();
  }, [selectedGame]);

  if (!draft) {
    return <></>;
  }

  return (
    <ScrollArea className="overflow-auto p-6 w-full  h-full">
      {/* Ban Phase 1 */}
      <div className="mb-2">
        <h3 className="text-xl font-semibold mb-2">First Ban Phase</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-500 p-4 rounded-lg">
            <div className="flex justify-center">
              {draft.bans1Blue.map((champion) => (
                <img
                  className="h-14 w-14"
                  src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
                />
              ))}
            </div>
          </div>
          <div className="bg-red-500 p-4 rounded-lg">
            <div className="flex justify-center">
              {draft.bans1Red.map((champion) => (
                <img
                  className="h-14 w-14"
                  src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pick Phase Following Correct Order */}
      <div className="mb-2">
        <h3 className="text-xl font-semibold mb-2">Pick Phase</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-600 p-4 rounded-lg">
            {draft.picks1Blue.map((champion) => (
              <img
                className="h-14 w-14"
                src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
              />
            ))}
            {draft.picks2Blue.map((champion) => (
              <img
                className="h-14 w-14"
                src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
              />
            ))}
          </div>
          <div className="bg-red-600 p-4 rounded-lg flex flex-col justify-end items-end">
            {draft.picks1Red.map((champion) => (
              <img
                className="h-14 w-14"
                src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
              />
            ))}
            {draft.picks2Red.map((champion) => (
              <img
                className="h-14 w-14"
                src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Ban Phase 2 */}
      <div className="mb-2">
        <h3 className="text-xl font-semibold mb-2">Second Ban Phase</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-500 p-4 rounded-lg">
            <div className="flex justify-center">
              {draft.bans2Blue.map((champion) => (
                <img
                  className="h-14 w-14"
                  src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
                />
              ))}
            </div>
          </div>
          <div className="bg-red-500 p-4 rounded-lg ">
            <div className="flex justify-center">
              {draft.bans2Red.map((champion) => (
                <img
                  className="h-14 w-14"
                  src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final Picks */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Final Pick Phase</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-600 p-4 rounded-lg">
            {draft.picks3Blue.map((champion) => (
              <img
                className="h-14 w-14"
                src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
              />
            ))}
          </div>
          <div className="bg-red-600 p-4 rounded-lg flex flex-col items-end justify-end">
            {draft.picks3Red.map((champion) => (
              <img
                className="h-14 w-14"
                src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
              />
            ))}
            {draft.picks4Red.map((champion) => (
              <img
                className="h-14 w-14"
                src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${champion}.png`}
              />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export default Draft;
