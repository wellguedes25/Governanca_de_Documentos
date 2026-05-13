import { NextResponse } from 'next/server';
import { getPoolStatus } from '@/lib/oracle';
import { getData } from '@/lib/storage';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const poolStatus = getPoolStatus();
    const storage = await getData();
    const activeConn = storage.connections.find(c => c.id === storage.activeConnectionId);

    return NextResponse.json({
      pool: poolStatus,
      connection: activeConn
        ? { name: activeConn.name, id: activeConn.id }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { pool: { active: false }, error: err.message },
      { status: 500 }
    );
  }
}
