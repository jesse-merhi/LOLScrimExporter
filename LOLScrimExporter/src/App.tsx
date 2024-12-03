import { useEffect, useState } from 'react';
import { graphqlQuery, graphqlVariables } from '@/lib/constants';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

function App() {
  const [participants, setParticipants] = useState([]);
  const [seriesData, setSeriesData] = useState([]);
  const [authToken, setAuthToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    try {
      const token = await invoke('login', { username, password });
      setAuthToken(token);
      console.log('Logged in, token:', token);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const fetchParticipants = async () => {
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
    if (!authToken) {
      console.error('No auth token, please log in first.');
      return;
    }

    const payload = JSON.stringify({
      operationName: 'GetHistoricalSeries',
      variables: graphqlVariables,
      query: graphqlQuery,
    });

    const response = await fetch('https://api.grid.gg/central-data/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    const data = await response.json();
    setSeriesData(data.data.allSeries.edges);
  };

  useEffect(() => {
    if (authToken) {
      fetchSeries();
    }
  }, [authToken]);

  return (
    <main className='h-screen w-screen'>
      {/* Sidebar and Main Content Layout */}
      <div className='h-full w-full flex flex-row'>
        {/* Sidebar */}
        <div className='h-full w-[20%] bg-red-50 p-4'>
          <h2>Games</h2>
          {seriesData.map((edge, index) => {
            const { node } = edge;
            const teams = node.teams;
            return (
              <div key={index}>
                {teams[0].baseInfo.name} vs. {teams[1].baseInfo.name}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className='h-full w-full p-4'>
          <div className='mb-4'>
            <h1>Login</h1>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                login();
              }}
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
              <button
                type='submit'
                className='bg-blue-500 text-white px-4 py-2'
              >
                Login
              </button>
            </form>
          </div>

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
      </div>
    </main>
  );
}

export default App;
