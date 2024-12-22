import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import { Button } from './ui/button';

function Login({
  setAuthToken,
  storeRefreshToken,
  storeAuthToken,
}: {
  setAuthToken: (authToken: string) => void;
  storeRefreshToken: (refreshToken: string) => void;
  storeAuthToken: (authToken: string) => void;
}) {
  const [username, setUsername] = useState(
    import.meta.env.PROD ? '' : import.meta.env.VITE_USERNAME
  );
  const [password, setPassword] = useState(
    import.meta.env.PROD ? '' : import.meta.env.VITE_PASSWORD
  );
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

export default Login;
