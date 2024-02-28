export {}


export interface Room {
    id: string;
    name: string;
    winnerId: string;
    createdAt: number;
    completedAt: number;
}