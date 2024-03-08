import { HighScore } from "@prisma/client";

export type CreateHighscore = Omit<HighScore, "id">;
