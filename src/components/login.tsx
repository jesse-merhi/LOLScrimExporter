import { storeAuthToken, storeRefreshToken } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import MoonLoader from "react-spinners/MoonLoader";
import { Button } from "./ui/button";

function Login({
  setReloadKey,
}: {
  setReloadKey: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [username, setUsername] = useState(
    import.meta.env.PROD ? "" : import.meta.env.VITE_USERNAME
  );

  const [password, setPassword] = useState(
    import.meta.env.PROD ? "" : import.meta.env.VITE_PASSWORD
  );
  const login = async () => {
    try {
      const cookies: string = await invoke("login", { username, password });
      const authTokenExtract = cookies
        .split(";")
        .find((value) => value.startsWith("Authorization="));
      const refreshTokenExtract = cookies
        .split(";")
        .find((value) => value.startsWith(" RefreshToken="));

      if (!authTokenExtract || !refreshTokenExtract) {
        throw new Error("Login failed: Missing tokens");
      }
      storeRefreshToken(
        refreshTokenExtract.replace(" RefreshToken=", "").trim()
      );
      storeAuthToken(authTokenExtract.replace("Authorization=", "").trim());
      setReloadKey((prev: number) => prev + 1);
    } catch (e) {
      throw new Error("Failed to login:" + e);
    }
  };

  const loginMutation = useMutation({
    mutationFn: login,
  });
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="h-[50%] w-[50%]">
        <h1 className="text-xl font-bold h-[20%]">Login</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loginMutation.mutate();
          }}
          className="h-full w-full"
        >
          <div className="mb-2">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="border p-2 w-full"
            />
          </div>
          <div className="mb-2">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="border p-2 w-full"
            />
          </div>
          {loginMutation.isError && (
            <div className="text-red-500 mt-2">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : "Login failed"}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <MoonLoader size="20" color="white" />
            ) : (
              "Login"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
