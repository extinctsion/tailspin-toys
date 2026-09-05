import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllCategories,
    getAllGames,
    getAllGameIds,
    getAllPublishers,
    getGameById,
    getGamesByFilters,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilteredGames(db: Database): Promise<{
    strategyId: number;
    puzzleId: number;
    pubOneId: number;
    pubTwoId: number;
}> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'cat' })
        .returning({ id: categories.id });
    const [pubOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });
    const [pubTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'pub' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        { title: 'Alpha Quest', description: 'Alpha', starRating: 4.5, categoryId: strategy.id, publisherId: pubOne.id },
        { title: 'Bravo Run', description: 'Bravo', starRating: 4.2, categoryId: strategy.id, publisherId: pubTwo.id },
        { title: 'Charlie Logic', description: 'Charlie', starRating: 3.8, categoryId: puzzle.id, publisherId: pubOne.id },
        { title: 'Delta Maze', description: 'Delta', starRating: 4.2, categoryId: puzzle.id, publisherId: pubOne.id },
    ]);

    return { strategyId: strategy.id, puzzleId: puzzle.id, pubOneId: pubOne.id, pubTwoId: pubTwo.id };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by category and publisher together', async () => {
        const filters = await seedFilteredGames(db);

        const byCategory = await getGamesByFilters(db, { categoryIds: [filters.strategyId] });
        expect(byCategory.map((game) => game.title)).toEqual(['Alpha Quest', 'Bravo Run']);

        const byPublisher = await getGamesByFilters(db, { publisherId: filters.pubOneId });
        expect(byPublisher.map((game) => game.title)).toEqual(['Alpha Quest', 'Charlie Logic', 'Delta Maze']);

        const byCombinedFilter = await getGamesByFilters(db, {
            categoryIds: [filters.strategyId, filters.puzzleId],
            publisherId: filters.pubOneId,
        });
        expect(byCombinedFilter.map((game) => game.title)).toEqual(['Alpha Quest', 'Charlie Logic', 'Delta Maze']);
    });

    it('returns categories and publishers in alphabetical order', async () => {
        await seedFilteredGames(db);

        await expect(getAllCategories(db)).resolves.toEqual([
            { id: expect.any(Number), name: 'Puzzle' },
            { id: expect.any(Number), name: 'Strategy' },
        ]);
        await expect(getAllPublishers(db)).resolves.toEqual([
            { id: expect.any(Number), name: 'Pub One' },
            { id: expect.any(Number), name: 'Pub Two' },
        ]);
    });
});
