import React, { useCallback, useState } from "react";
import { View } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

const YouTubeVideoPlayer = ({ videoURL }: { videoURL: string }) => {
  const [playing, setPlaying] = useState(false);
  const onStateChange = useCallback((state: string) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  return (
    <View>
      <YoutubePlayer
        height={200}
        play={playing}
        videoId={videoURL}
        onChangeState={onStateChange}
      />
    </View>
  );
};

export default YouTubeVideoPlayer;
