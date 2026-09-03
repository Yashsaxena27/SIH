import asyncio
import asyncpg
async def main():
    try:
        conn = await asyncpg.connect('postgresql://sih_user:sih_password@localhost:5432/sih_db')
        print('Connected!')
        await conn.close()
    except Exception as e:
        print(f'Error: {e}')
asyncio.run(main())
