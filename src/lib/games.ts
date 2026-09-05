import { eq, asc } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

export type GameSort = 'title-asc' | 'title-desc' | 'rating-desc';

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

/**
 * Sorts games for the catalog while keeping unrated games after rated games.
 *
 * @param gamesToSort - Games to order.
 * @param sort - Requested catalog sort order.
 * @returns A new array containing the games in the requested order.
 */
export function sortGames(gamesToSort: Game[], sort: GameSort): Game[] {
    return [...gamesToSort].sort((a, b) => {
        if (sort === 'rating-desc') {
            if (a.starRating === null && b.starRating !== null) return 1;
            if (a.starRating !== null && b.starRating === null) return -1;
            if (a.starRating !== null && b.starRating !== null && a.starRating !== b.starRating) {
                return b.starRating - a.starRating;
            }
        }

        const titleComparison = a.title.localeCompare(b.title);
        return sort === 'title-desc' ? -titleComparison : titleComparison;
    });
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** Returns all games ordered by title. */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** Returns all game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** Returns a single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
