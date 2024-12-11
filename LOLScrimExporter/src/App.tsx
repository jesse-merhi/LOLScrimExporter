import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import MoonLoader from 'react-spinners/MoonLoader';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';
import SidebarLoader, {
  SeriesDetailsResponse,
  SeriesState,
} from './components/sidebar-loader';

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

function App() {
  const [gameSummary, setGameSummary] = useState([]);
  const [seriesDetails, setSeriesDetails] = useState<Record<
    string,
    SeriesState
  > | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authToken, setAuthToken] = useState<string | null>('');
  const [gameLoading, setGameLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<null | string>(null);
  const [scores, setScores] = useState([0, 0]);

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
    document.location.reload();
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

  const checkLoggedIn = async () => {
    const authToken = getAuthToken();
    console.log('Checking Logged in');
    if (!authToken) {
      return;
    }

    const response = await fetch(`https://lol.grid.gg/auth/verify`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log(response.json());
  };

  useEffect(() => {
    checkLoggedIn();
  }, []);

  useEffect(() => {
    fetchGameSummary();
  }, [selectedGame]);

  console.log('AUTH', authToken);
  if (!getAuthToken()) {
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

        <div className='h-full w-[20%] bg-primary'>
          <div className='h-[90%] overflow-y-scroll no-scrollbar px-4'>
            <SidebarLoader
              authToken={getAuthToken()}
              setGameLoading={setGameLoading}
              setSelectedGame={setSelectedGame}
              setScores={setScores}
              setAuthToken={setAuthToken}
            />
          </div>
          <div className='h-[10%] flex items-center justify-center border-t-2 border-slate-700'>
            <Button onClick={logout} className='text-[150%] '>
              Log Out
            </Button>
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
                          {scores[0] > scores[1] ? (
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
                          {scores[1] > scores[0] ? (
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
