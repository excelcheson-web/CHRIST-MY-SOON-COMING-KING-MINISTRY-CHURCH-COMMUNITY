import {
  ArrowRight,
  BookOpen,
  Calendar,
  Church,
  Cross,
  GraduationCap,
  Heart,
  HeartHandshake,
  Home,
  MessageCircle,
  Sparkles,
  UserPlus,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'

/** Icon names used by `lib/site.ts` resolve here, so navigation data stays plain. */
export const navIcons = {
  home: Home,
  cross: Cross,
  family: Users,
  book: BookOpen,
  user: Users,
  userPlus: UserPlus,
  sermons: Video,
  prayer: HeartHandshake,
  events: Calendar,
  salvation: Heart,
  disciples: GraduationCap,
  community: MessageCircle,
  church: Church,
  arrowRight: ArrowRight,
  testimonies: Sparkles,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof navIcons
