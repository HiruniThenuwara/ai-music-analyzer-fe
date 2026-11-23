import {
  Activity, AudioLines, Database, FlaskConical, LayoutDashboard,
  ListMusic, MessageSquare, Mic, Network, Settings,
} from "lucide-react";

export const sections = [
  { slug: "", title: "Dashboard", icon: LayoutDashboard, group: "Workspace", description: "Monitor the local research workstation." },
  { slug: "datasets", title: "Datasets", icon: Database, group: "Research", description: "Inspect dataset manifests and audio validation results." },
  { slug: "training", title: "Training", icon: Activity, group: "Research", description: "Monitor managed training jobs and their progress." },
  { slug: "models", title: "Models", icon: Network, group: "Research", description: "Browse checkpoints registered for inference." },
  { slug: "experiments", title: "Experiments", icon: FlaskConical, group: "Research", description: "Review experiment configurations, metrics, and artifacts." },
  { slug: "analysis", title: "Analysis", icon: AudioLines, group: "Audio", description: "Explore estimated musical features from audio." },
  { slug: "songs", title: "Songs", icon: ListMusic, group: "Audio", description: "Browse the local song catalog and analysis results." },
  { slug: "transcription", title: "Transcription", icon: Mic, group: "Audio", description: "Review dominant-pitch and music-feature estimates." },
  { slug: "assistant", title: "Assistant", icon: MessageSquare, group: "Tools", description: "Access research conversations and their saved history." },
  { slug: "settings", title: "Settings", icon: Settings, group: "Tools", description: "Inspect local workstation service availability." },
] as const;

export const groups = ["Workspace", "Research", "Audio", "Tools"] as const;
