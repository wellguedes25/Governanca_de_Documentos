import { NextRequest, NextResponse } from 'next/server';
import { getData, saveData, CustomCard } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const data = await getData();
    return NextResponse.json(data.customCards || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const card: CustomCard = await req.json();
    const data = await getData();
    
    if (!data.customCards) data.customCards = [];
    
    // Check if updating or creating
    const index = data.customCards.findIndex(c => c.id === card.id);
    if (index >= 0) {
      data.customCards[index] = card;
    } else {
      data.customCards.push(card);
    }
    
    await saveData(data);
    return NextResponse.json({ success: true, card });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    console.log('API: Iniciando exclusão do card ID:', id);
    
    if (!id) throw new Error('ID do card não fornecido');

    const data = await getData();
    const initialCount = (data.customCards || []).length;
    
    data.customCards = (data.customCards || []).filter(c => String(c.id) !== String(id));
    
    const finalCount = data.customCards.length;
    console.log(`API: Cards antes: ${initialCount}, Cards depois: ${finalCount}`);
    
    await saveData(data);
    return NextResponse.json({ success: true, removed: initialCount - finalCount });
  } catch (err: any) {
    console.error('API: Erro ao excluir card:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
