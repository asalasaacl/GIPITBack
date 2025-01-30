import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const {
    name,
    phone,
    email,
    address,
    jsongpt_text,
    process_id,
    technical_skills,
    soft_skills,
    client_comments,
    match_percent,
    total_experience,
    stage,
    interview_questions,
    management_id,
    start_date,
    end_date,
    position,
    rate,
    status
  } = await req.json();

  try {
    // Verificar si ya existe un candidato con el mismo correo
    const existingCandidate = await prisma.candidates.findFirst({
      where: {
        email: email
      }
    });

    if (existingCandidate) {
      return NextResponse.json({ 
        error: "Ya existe un candidato registrado con este correo electrónico. Por favor utilice uno diferente." 
      }, { 
        status: 409 
      });
    }

    const candidate = await prisma.candidates.create({
      data: {
        name,
        phone,
        email,
        address,
        jsongpt_text,
        total_experience,
      },
    });

    // Crear el proceso del candidato si se proporciona process_id
    let candidateProcess = null;
    if (process_id) {
      candidateProcess = await prisma.candidate_process.create({
        data: {
          candidate_id: candidate.id,
          process_id,
          technical_skills,
          soft_skills,
          client_comments,
          match_percent,
          interview_questions,
          stage,
        },
      });
    }

    // Crear la gestión del candidato si se proporciona management_id
    let candidateManagement = null;
    if (management_id) {
      candidateManagement = await prisma.candidate_management.create({
        data: {
          candidate_id: candidate.id,
          management_id,
          status,
          start_date,
          end_date,
          position,
          rate: parseFloat(rate),
        },
      });
    }
    
    return NextResponse.json({
      candidate,
      candidateProcess,
      candidateManagement,
      message: "Candidato creado exitosamente con sus relaciones",
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: `Error al crear candidato o sus relaciones: ${error.message}` 
      }, { 
        status: 500 
      });
    }
    return NextResponse.json({ 
      error: 'Error desconocido al procesar la solicitud' 
    }, { 
      status: 500 
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const status = searchParams.get('status') || '';

    const candidates = await prisma.candidates.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ],
        candidate_management: status ? {
          some: { status: status }
        } : undefined
      },
      include: {
        candidate_management: true,
        candidate_process: true
      }
    });

    return NextResponse.json(candidates);
  } catch (error) {
    return NextResponse.json({ 
      error: `Error al obtener candidatos: ${error}` 
    }, { 
      status: 500 
    });
  }
}