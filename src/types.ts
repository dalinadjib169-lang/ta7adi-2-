export type Rank = 'worm' | 'eagle' | 'tiger' | 'lion' | 'dragon' | 'phoenix' | 'legend';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  points: number;
  level: number;
  unlockedLevels: number[];
  levelScores: Record<number, number>;
  rank: Rank;
  role: 'student' | 'teacher';
  bonusPoints: number;
  lastBonusDate?: string;
  lastActive: number;
  isOnline: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: number;
  seen: boolean;
}

export interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerRank?: Rank;
  challengedId: string;
  challengedName: string;
  challengedRank?: Rank;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'playing';
  challengerScore?: number;
  challengerTime?: number;
  challengerLevel?: number;
  challengerAnswers?: string[];
  challengedScore?: number;
  challengedTime?: number;
  challengedLevel?: number;
  challengedAnswers?: string[];
  winnerId?: string;
  pointsTransferred?: boolean;
  timestamp: number;
  questions?: Question[];
}

export interface Question {
  id: string;
  type: 'text' | 'image';
  answerType: 'choice' | 'input';
  content: string;
  subContent?: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  imageUrl?: string;
  timer: number;
}
