import {
  Activity, AudioLines, Database, FlaskConical, LayoutDashboard,
  ListMusic, MessageSquare, Mic, Network, Settings,
} from "lucide-react";

export const sections = [
  { slug: "", title: "Dashboard", icon: LayoutDashboard, group: "Workspace", description: "Monitor the local research workstation.", prerequisite: "" },
  { slug: "datasets", title: "Datasets", icon: Database, group: "Research", description: "Configure local audio and annotation sources for research.", prerequisite: "Dataset listing and ingestion APIs must be implemented. Audio ingestion also requires a working decoder." },
  { slug: "training", title: "Training", icon: Activity, group: "Research", description: "Monitor managed training jobs and their progress.", prerequisite: "Training requires a validated dataset, a working PyTorch runtime, and the managed job API." },
  { slug: "models", title: "Models", icon: Network, group: "Research", description: "Browse checkpoints registered for inference.", prerequisite: "Model browsing requires the registry API and real checkpoint metadata. Inference also requires verified compatible checkpoints." },
  { slug: "experiments", title: "Experiments", icon: FlaskConical, group: "Research", description: "Review experiment configurations, metrics, and artifacts.", prerequisite: "Experiment browsing requires persisted runs and an API for configurations, metrics, and artifacts." },
  { slug: "analysis", title: "Analysis", icon: AudioLines, group: "Audio", description: "Explore estimated musical features from audio.", prerequisite: "Analysis requires decodable audio and an analysis API that estimates music features." },
  { slug: "songs", title: "Songs", icon: ListMusic, group: "Audio", description: "Browse the local song catalog and analysis results.", prerequisite: "The song library requires the song catalog API and local audio records." },
  { slug: "transcription", title: "Transcription", icon: Mic, group: "Audio", description: "Review dominant-pitch and music-feature estimates.", prerequisite: "Dominant-pitch estimation requires decodable audio and a transcription API." },
  { slug: "assistant", title: "Assistant", icon: MessageSquare, group: "Tools", description: "Access research conversations and their saved history.", prerequisite: "The assistant requires its local persistence setup and assistant API." },
  { slug: "settings", title: "Settings", icon: Settings, group: "Tools", description: "Inspect local workstation service availability.", prerequisite: "" },
] as const;

export const groups = ["Workspace", "Research", "Audio", "Tools"] as const;
