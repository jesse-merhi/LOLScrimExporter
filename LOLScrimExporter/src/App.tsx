import { useEffect, useState } from 'react';
import { graphqlQuery, graphqlVariables } from '@/lib/constants';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import { Button } from './components/ui/button';
import { ScrollArea } from './components/ui/scroll-area';
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
  const [participants, setParticipants] = useState([]);
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [seriesDetails, setSeriesDetails] = useState<Record<
    string,
    SeriesState
  > | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authToken, setAuthToken] = useState('');
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

  const fetchParticipants = async () => {
    const authToken = getAuthToken();
    if (!authToken) {
      console.error('No auth token, please log in first.');
      return;
    }

    const response = await fetch(
      'https://api.grid.gg/file-download/end-state/riot/series/2710435/games/1/summary',
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const data = await response.json();
    setParticipants(data.participants);
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
    <main className='h-screen w-screen'>
      {/* Sidebar and Main Content Layout */}
      <div className='h-full w-full flex flex-row'>
        {/* Sidebar */}

        <div className='h-full w-[20%] bg-red-50 p-4'>
          <ScrollArea className='h-[90%]'>
            {seriesDetails &&
              seriesData &&
              seriesData.map((edge, index) => {
                const { node } = edge;
                const teams = node.teams;
                const team1Score = seriesDetails[node.id]?.teams[0].score;
                const team2Score = seriesDetails[node.id]?.teams[1].score;
                console.log(seriesDetails);
                console.log(team2Score);
                return (
                  <div
                    className='h-10 w-full bg-red-100 flex justify-center items-center'
                    key={index}
                  >
                    <img src={teams[0].baseInfo.logoUrl} className='h-full' />{' '}
                    {team1Score} x {team2Score}
                    <img src={teams[1].baseInfo.logoUrl} className='h-full' />
                  </div>
                );
              })}
          </ScrollArea>
          <div className='h-[10%] flex items-end justify-center'>
            <Button onClick={logout}>Log Out</Button>
          </div>
        </div>
        {selectedGame ? (
          <div className='h-full w-full p-4'>
            <div className='mb-4'>
              <h1>Participants</h1>
              <button
                onClick={fetchParticipants}
                className='bg-green-500 text-white px-4 py-2 mb-2'
              >
                Fetch Participants
              </button>
              <ul>
                {participants.map((player, index) => (
                  <li key={index} className='mb-2'>
                    <p>{player.riotIdGameName}</p>
                    <p>Wards Placed: {player.wardsPlaced}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h1>Series Data</h1>
              <ul>
                {seriesData.map((edge, index) => {
                  const { node } = edge;
                  const teams = node.teams;
                  return (
                    <li key={index} className='mb-2'>
                      <p>
                        {node.id}: {teams[0].baseInfo.name} vs{' '}
                        {teams[1].baseInfo.name}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>
    </main>
  );
}

export default App;
