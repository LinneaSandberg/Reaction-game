/**
 * Service for player
 */
import prisma from "../prisma"

export const getPlayer = (playerId: string) => {
    return prisma.player.findUnique({
        where: {
            id: playerId,
        },
    });
}

export const deletePlayer = (playerId: string) => {
    return prisma.player.delete({
        where: {
            id: playerId,
        },
})
};