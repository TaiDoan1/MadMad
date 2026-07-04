import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

export function LoadingBar() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (navigation.state === "loading") {
      setIsLoading(true);
      setProgress(30);

      const interval = setInterval(() => {
        setProgress((previousProgress) => (previousProgress >= 90 ? previousProgress : previousProgress + 10));
      }, 100);

      return () => clearInterval(interval);
    }

    if (navigation.state === "idle" && isLoading) {
      setProgress(100);
      const timeout = window.setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 300);

      return () => window.clearTimeout(timeout);
    }
  }, [isLoading, navigation.state]);

  if (!isLoading && progress === 0) {
    return null;
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-[9999] h-1 bg-transparent">
      <div
        className="shimmer h-full bg-gradient-to-r from-primary via-destructive to-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
