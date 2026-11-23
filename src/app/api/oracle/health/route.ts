import { NextResponse } from 'next/server';
import { getPoolStatus } from '@/lib/oracle';
import { getData } from '@/lib/storage';
import { isDemoConnection } from '@/lib/demo-mock';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const storage = await getData();
    const activeConn = storage.connections.find(c => c.id === storage.activeConnectionId);
    const isDemo = isDemoConnection(activeConn);
    const poolStatus = isDemo
      ? { active: true, alias: 'DEMO_SANDBOX_VIRTUAL', poolMin: 1, poolMax: 1 }
      : getPoolStatus();

    return NextResponse.json({
      pool: poolStatus,
      connection: activeConn
        ? { name: activeConn.name, id: activeConn.id, isDemo }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { pool: { active: false }, error: err.message },
      { status: 500 }
    );
  }
}
