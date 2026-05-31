type LoadingScreenProps = {
  fullScreen?: boolean;
};

export function LoadingScreen({ fullScreen = true }: LoadingScreenProps) {
  return (
    <div className={`flex items-center justify-center bg-gray-50 ${fullScreen ? "min-h-screen" : "min-h-[240px] rounded-lg"}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-teal-700" />
    </div>
  );
}
