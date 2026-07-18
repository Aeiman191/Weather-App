import axios from "axios";

const YOUTUBE_SEARCH_URL =
  "https://www.googleapis.com/youtube/v3/search";

interface YouTubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface YouTubeSearchItem {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      default?: YouTubeThumbnail;
      medium?: YouTubeThumbnail;
      high?: YouTubeThumbnail;
    };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

export interface TravelVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
  youtubeUrl: string;
  embedUrl: string;
}

export const searchTravelVideos = async (
  location: string,
  maxResults: number = 6
): Promise<TravelVideo[]> => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "YOUTUBE_API_KEY is not configured"
    );
  }

  const cleanedLocation = location.trim();

  if (!cleanedLocation) {
    throw new Error("Location is required");
  }

  const safeMaxResults = Math.min(
    Math.max(maxResults, 1),
    12
  );

  const query =
    `things to do in ${cleanedLocation} ` +
    `travel guide places to visit`;

  const response =
    await axios.get<YouTubeSearchResponse>(
      YOUTUBE_SEARCH_URL,
      {
        params: {
          part: "snippet",
          q: query,
          type: "video",
          maxResults: safeMaxResults,
          safeSearch: "moderate",
          videoEmbeddable: "true",
          key: apiKey,
        },
        timeout: 10000,
      }
    );

  const items = response.data.items ?? [];

  return items
    .filter(
      (item) =>
        item.id?.videoId &&
        item.snippet?.title
    )
    .map((item) => {
      const videoId = item.id!.videoId!;
      const snippet = item.snippet!;

      const thumbnail =
        snippet.thumbnails?.high?.url ??
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.default?.url ??
        "";

      return {
        videoId,
        title: snippet.title ?? "Untitled video",
        description: snippet.description ?? "",
        channelTitle:
          snippet.channelTitle ?? "Unknown channel",
        publishedAt: snippet.publishedAt ?? "",
        thumbnail,
        youtubeUrl:
          `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl:
          `https://www.youtube.com/embed/${videoId}`,
      };
    });
};