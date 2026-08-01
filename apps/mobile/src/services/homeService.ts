export interface FeaturedEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  image: string;
  actionText?: string;
  isRegistered?: boolean;
}

export interface QuickAccessItem {
  id: string;
  title: string;
  iconName: string;
  iconColor: string;
  bgColor: string;
  route: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  dateTime: string;
  venue: string;
  iconName: string;
  iconColor: string;
  bgColor: string;
}

export const MOCK_FEATURED_EVENTS: FeaturedEvent[] = [
  {
    id: 'feat-1',
    title: 'Annual General Meeting',
    date: '15 August 2026',
    venue: 'Shree Maheshwari Bhawan, Jaipur',
    image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
    actionText: 'Register Now',
  },
  {
    id: 'feat-2',
    title: 'Mahesh Navami Mahotsav 2026',
    date: '20 June 2026',
    venue: 'Maheshwari Bhavan, Ranchi',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    actionText: 'Join Celebration',
  },
  {
    id: 'feat-3',
    title: 'Youth Leadership & Business Summit',
    date: '10 October 2026',
    venue: 'Convention Center, Jaipur',
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
    actionText: 'Book Seat',
  },
  {
    id: 'feat-4',
    title: 'Diwali Sneh Milan & Cultural Night',
    date: '05 November 2026',
    venue: 'Community Hall, Ranchi',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    actionText: 'View Details',
  },
];

export const MOCK_QUICK_ACCESS: QuickAccessItem[] = [
  {
    id: 'qa-members',
    title: 'Members',
    iconName: 'people',
    iconColor: '#4A5568',
    bgColor: '#FFFFFF',
    route: '/(member)/directory',
  },
  {
    id: 'qa-events',
    title: 'Events',
    iconName: 'calendar',
    iconColor: '#C53030',
    bgColor: '#FFFFFF',
    route: '/(member)/events',
  },
  {
    id: 'qa-gallery',
    title: 'Gallery',
    iconName: 'images',
    iconColor: '#2B6CB0',
    bgColor: '#FFFFFF',
    route: '/(member)/gallery',
  },
  {
    id: 'qa-notices',
    title: 'Notices',
    iconName: 'notifications',
    iconColor: '#DD6B20',
    bgColor: '#FFFFFF',
    route: '/(member)/notices',
  },
];

export const MOCK_UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    id: 'up-1',
    title: 'Blood Donation Camp',
    dateTime: '10 Nov 2026 | 09:00 AM',
    venue: 'Shree Maheshwari Bhawan',
    iconName: 'pulse',
    iconColor: '#E53E3E',
    bgColor: '#FFEBF0',
  },
  {
    id: 'up-2',
    title: 'Free Health Checkup Drive',
    dateTime: '25 Nov 2026 | 10:00 AM',
    venue: 'Maheshwari Hospital, Jaipur',
    iconName: 'fitness',
    iconColor: '#319795',
    bgColor: '#E6FFFA',
  },
  {
    id: 'up-3',
    title: 'Career Guidance Seminar',
    dateTime: '05 Dec 2026 | 04:00 PM',
    venue: 'Youth Center, Ranchi',
    iconName: 'school',
    iconColor: '#3182CE',
    bgColor: '#EBF8FF',
  },
];

export class HomeService {
  static getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }

  static async getFeaturedEvents(): Promise<FeaturedEvent[]> {
    return [];
  }

  static async getUpcomingEvents(): Promise<UpcomingEvent[]> {
    return [];
  }
}
