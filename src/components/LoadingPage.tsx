import MoonLoader from "react-spinners/MoonLoader";

function LoadingPage({
  mode,
  size,
}: {
  mode: "light" | "dark";
  size?: number;
}) {
  return (
    <div className="py-2 w-full h-full flex flex-col justify-center items-center ">
      <MoonLoader
        size={size ? size : 25}
        color={mode == "light" ? "black" : "white"}
      />
    </div>
  );
}

export default LoadingPage;
