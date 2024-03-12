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

export const findPlayer = (gameId: string) => {
    return prisma.game.findUnique({
        where: {

            id: gameId,
        },
        include: {
            players: true,
        },
    });
}

// export const getgame = (gameId: string) => {
//     return prisma.game.findUnique({
//         where: {
//             id: gameId,
//         },
//     });
// }

export const getRoomId = (gameId: string) => {
    return prisma.game.findUnique({
        where: {
            id: gameId,
        }
    });
}