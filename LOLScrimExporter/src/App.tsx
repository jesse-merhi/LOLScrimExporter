import { useEffect, useState } from 'react';
import { graphqlQuery, graphqlVariables } from '@/lib/constants';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import MoonLoader from 'react-spinners/MoonLoader';
import { Button } from './components/ui/button';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
// Type for a single player
interface Player {
  id: string;
  name: string;
  character?: {
    id: string;
    name: string;
  };
}

// Type for a game
interface Game {
  teams: {
    id: string;
    players: Player[];
  }[];
}

// Type for a single series state
interface SeriesState {
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
interface SeriesDetailsResponse {
  data: {
    seriesState: SeriesState;
  };
}

function App() {
  const [gameSummary, setGameSummary] = useState([]);
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [seriesDetails, setSeriesDetails] = useState<Record<
    string,
    SeriesState
  > | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [gameLoading, setGameLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<null | string>(null);

  // Helper functions to manage localStorage
  const getAuthToken = () => localStorage.getItem('authToken') || '';
  const getRefreshToken = () => localStorage.getItem('refreshToken') || '';
  const storeAuthToken = (token: string) =>
    localStorage.setItem('authToken', token);
  const storeRefreshToken = (token: string) =>
    localStorage.setItem('refreshToken', token);
  const clearTokens = () => {
    localStorage.removeItem('authToken');
    setAuthToken('');
    localStorage.removeItem('refreshToken');
  };

  const login = async () => {
    try {
      const cookies: string = await invoke('login', { username, password });
      const authTokenExtract = cookies
        .split(';')
        .find((value) => value.startsWith('Authorization='));
      const refreshTokenExtract = cookies
        .split(';')
        .find((value) => value.startsWith(' RefreshToken='));

      if (authTokenExtract && refreshTokenExtract) {
        setAuthToken(authTokenExtract.replace('Authorization=', '').trim());
        storeRefreshToken(
          refreshTokenExtract.replace(' RefreshToken=', '').trim()
        );
        storeAuthToken(authTokenExtract.replace('Authorization=', '').trim());
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      const authToken = getAuthToken();
      const refreshToken = getRefreshToken();
      await invoke('logout', { authToken, refreshToken });
      clearTokens();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const fetchGameSummary = async () => {
    const authToken = getAuthToken();
    if (!authToken) {
      console.error('No auth token, please log in first.');
      return;
    }

    const response = await fetch(
      `https://api.grid.gg/file-download/end-state/riot/series/${selectedGame}/games/1/summary`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const data = await response.json();
    setGameSummary(data.participants);
    console.log('participants', gameSummary, seriesDetails);
    setGameLoading(false);
  };

  const fetchSeries = async () => {
    const authToken = getAuthToken();
    if (!authToken) {
      console.error('No auth token, please log in first.');
      return;
    }

    // Fetch historical series
    const historicalPayload = JSON.stringify({
      operationName: 'GetHistoricalSeries',
      variables: graphqlVariables,
      query: graphqlQuery,
    });

    try {
      const historicalResponse = await fetch(
        'https://api.grid.gg/central-data/graphql',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: historicalPayload,
        }
      );

      if (!historicalResponse.ok) {
        console.error(
          'Failed to fetch historical series:',
          historicalResponse.statusText
        );
        return;
      }

      const historicalData = await historicalResponse.json();

      // Extract series IDs
      const seriesEdges = historicalData?.data?.allSeries?.edges || [];
      const seriesIds = seriesEdges.map((edge) => edge.node.id);

      if (seriesIds.length === 0) {
        console.warn('No series found in the historical data.');
        return;
      }

      console.log('Fetched series IDs:', seriesIds);

      // Fetch details for each series ID
      const seriesDetailsPromises = seriesIds.map(async (id) => {
        const seriesDetailsPayload = JSON.stringify({
          operationName: 'GetSeriesPlayersAndResults',
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
                games {
                  teams {
                    id
                    players {
                      id
                      character {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          `,
        });

        const response = await fetch(
          'https://api.grid.gg/live-data-feed/series-state/graphql',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: seriesDetailsPayload,
          }
        );

        if (!response.ok) {
          console.error(
            `Failed to fetch details for series ID ${id}:`,
            response.statusText
          );
          return null;
        }

        const data: SeriesDetailsResponse = await response.json();
        return { [id]: data.data.seriesState };
      });

      // Resolve all series details
      const seriesDetails = await Promise.all(seriesDetailsPromises);

      // Filter out failed requests and update state
      const validSeriesDetails: SeriesDetailsResponse[] = seriesDetails.filter(
        (detail) => detail !== null
      );
      let newRecord = {};
      validSeriesDetails.forEach(
        (series) => (newRecord = { ...series, ...newRecord })
      );
      setSeriesData(seriesEdges);
      setSeriesDetails(newRecord);

      console.log('Fetched series details:', validSeriesDetails);
    } catch (error) {
      console.error('Error fetching series:', error);
    }
  };

  useEffect(() => {
    const authToken = getAuthToken();
    if (authToken) {
      fetchSeries();
    }
  }, [authToken]);

  useEffect(() => {
    const authToken = getAuthToken();
    if (authToken) {
      fetchGameSummary();
    }
  }, [selectedGame]);

  if (!authToken) {
    return (
      <div className='w-screen h-screen flex items-center justify-center'>
        <div className='h-[50%] w-[50%]'>
          <h1 className='text-xl font-bold h-[20%]'>Login</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
            className='h-full w-full'
          >
            <div className='mb-2'>
              <label>Username:</label>
              <input
                type='text'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder='Enter username'
                className='border p-2 w-full'
              />
            </div>
            <div className='mb-2'>
              <label>Password:</label>
              <input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Enter password'
                className='border p-2 w-full'
              />
            </div>
            <div className='w-full h-[20%] flex justify-center items-end'>
              <Button type='submit' className='w-full'>
                Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  return (
    <main className='h-screen w-screen bg-primary-foreground'>
      {/* Sidebar and Main Content Layout */}
      <div className='h-full w-full flex flex-row'>
        {/* Sidebar */}

        <div className='h-full w-[20%] bg-primary p-4'>
          <ScrollArea className='h-[90%]'>
            {seriesDetails &&
              seriesData &&
              seriesData.map((edge, index) => {
                const { node } = edge;
                const teams = node.teams;
                const team1Score = seriesDetails[node.id]?.teams[0].score;
                const team2Score = seriesDetails[node.id]?.teams[1].score;
                return (
                  <>
                    <div
                      className='h-12 w-full border-b-2 text-accent flex justify-center items-center p-2 cursor-pointer hover:bg-slate-800'
                      key={index}
                      onClick={() => {
                        setSelectedGame(node.id);
                        setGameLoading(true);
                      }}
                    >
                      <img src={teams[0].baseInfo.logoUrl} className='h-full' />{' '}
                      {team1Score} x {team2Score}
                      <img src={teams[1].baseInfo.logoUrl} className='h-full' />
                    </div>
                  </>
                );
              })}
          </ScrollArea>
          <div className='h-[10%] flex items-end justify-center'>
            <Button onClick={logout}>Log Out</Button>
          </div>
        </div>
        <div className='h-full w-[80%] p-4'>
          {gameLoading && selectedGame ? (
            <div className='w-full h-full items-center flex justify-center'>
              <MoonLoader />
            </div>
          ) : selectedGame ? (
            <div className=''>
              <ul>
                {gameSummary ? (
                  gameSummary.map((player, index) => (
                    <>
                      {index == 0 && (
                        <div className='flex-row flex items-center my-2'>
                          {' '}
                          <h1 className='text-lg font-semibold'>
                            Blue Team
                          </h1>{' '}
                          {seriesDetails[selectedGame].teams[0].score >
                          seriesDetails[selectedGame].teams[1].score ? (
                            <h1 className='text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-blue-500 text-white'>
                              Victory
                            </h1>
                          ) : (
                            <h1 className='text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-red-500 text-white'>
                              Defeat
                            </h1>
                          )}
                        </div>
                      )}
                      <div
                        key={index}
                        className='mb-2 flex justify-left items-center flex-row '
                      >
                        <div className=' w-[30%] flex flex-row justify-start items-center '>
                          <img
                            className='h-10 w-10'
                            src={`https://opgg-static.akamaized.net/meta/images/lol/latest/champion/${player.championName}.png`}
                          />
                          <h1 className='px-3 text-xl w-[18%] text-center'>
                            {player.champLevel}
                          </h1>
                          <div className='flex items-start justify-center flex-col'>
                            <div className='font-semibold'>
                              {player.riotIdGameName}
                            </div>
                            <div>{player.championName}</div>
                          </div>
                        </div>
                        <div className='w-[15%]  justify-center items-center text-center'>
                          <div>
                            {player.kills}/{player.deaths}/{player.assists}
                          </div>
                        </div>
                        <div className='flex items-center justify-center flex-row'>
                          {[0, 1, 2, 3, 4, 5]
                            .map((item) => player['item' + item])
                            .sort((a, b) => b - a)
                            .map((item) =>
                              item ? (
                                <img
                                  className='h-10 w-10'
                                  src={`https://opgg-static.akamaized.net/meta/images/lol/latest/item/${item}.png`}
                                />
                              ) : (
                                <div className='border-2 border-slate-500 h-10 w-10'></div>
                              )
                            )}
                          <img
                            className='h-10 w-10'
                            src={`https://opgg-static.akamaized.net/meta/images/lol/latest/item/${player['item6']}.png`}
                          />
                        </div>
                        <div className='w-[10%] items-center  justify-center flex'>
                          {' '}
                          {player.totalMinionsKilled}
                          cs
                        </div>{' '}
                        <div className='w-[10%] items-center justify-center flex'>
                          {' '}
                          {parseInt(player.goldEarned).toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                          })}
                          g
                        </div>
                      </div>
                      {index == 4 && (
                        <div className='flex-row flex items-center'>
                          <Separator className='my-4 ' />
                        </div>
                      )}
                      {index == 4 && (
                        <div className='flex-row flex items-center my-2'>
                          <h1 className='text-lg font-semibold'>Red Team</h1>
                          {seriesDetails[selectedGame].teams[1].score >
                          seriesDetails[selectedGame].teams[0].score ? (
                            <h1 className='text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-blue-500 text-white'>
                              Victory
                            </h1>
                          ) : (
                            <h1 className='text-lg ml-2 px-2 py-[1px] rounded-md font-semibold bg-red-500 text-white'>
                              Defeat
                            </h1>
                          )}
                        </div>
                      )}
                    </>
                  ))
                ) : (
                  <div>No Game Data Found</div>
                )}
              </ul>
            </div>
          ) : (
            <div className='h-full w-full text-lg font-semibold flex justify-center items-center'>
              Pick a game on the side to view its details.{' '}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
