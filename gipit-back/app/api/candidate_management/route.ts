import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

/**
 * @swagger
 * /candidate_management:
 *   get:
 *     summary: Obtener todos los registros de gestión de candidatos
 *     responses:
 *       200:
 *         description: Lista de registros de gestión de candidatos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CandidateManagement'
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const companyId = parseInt(url.searchParams.get('company_id') || '0');

  if (isNaN(companyId) || companyId <= 0) {
    return NextResponse.json({ error: 'ID de compañía inválido' }, { status: 400 });
  }

  try {
    const candidateManagementRecords = await prisma.candidate_management.findMany({
      where: {
        management: {
          company_id: companyId,
        },
      },
      include: {
        candidates: true,
      },
    });

    console.log("Registros de gestión de candidatos para la compañía ID:", companyId, candidateManagementRecords);

    return NextResponse.json(candidateManagementRecords);
  } catch (error) {
    return NextResponse.json({ error: `Error fetching data - ${error}` }, { status: 500 });
  }
}

/**
 * @swagger
 * /candidate_management:
 *   post:
 *     summary: Crear un nuevo registro de gestión de candidato
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidate_id:
 *                 type: integer
 *               management_id:
 *                 type: integer
 *               status:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Registro de gestión de candidato creado exitosamente
 *       500:
 *         description: Error al crear el registro de gestión de candidato
 */
export async function POST(req: NextRequest) {
  const { candidate_id, management_id, start_date, end_date, position, rate } = await req.json();

  try {
    if (!rate || !position) {
      return NextResponse.json({ 
        error: 'El valor hora y el cargo son campos requeridos' 
      }, { status: 400 });
    }

    // Determinar el status inicial
    const status = end_date ? "activo" : "desvinculado";

    const candidateManagement = await prisma.candidate_management.create({
      data: {
        candidate_id,
        management_id,
        status,
        start_date,
        end_date,
        position,
        rate: parseFloat(rate)
      },
    });

    // Si hay fecha de término y el status es activo, programar la actualización
    if (end_date && status === "activo") {
      const endDateTime = new Date(end_date);
      const now = new Date();
      
      if (endDateTime > now) {
        // Programar la actualización del status
        const timeUntilEnd = endDateTime.getTime() - now.getTime();
        
        setTimeout(async () => {
          try {
            await prisma.candidate_management.update({
              where: { id: candidateManagement.id },
              data: { status: "desvinculado" }
            });
          } catch (error) {
            console.error("Error al actualizar el status:", error);
          }
        }, timeUntilEnd);
      }
    }

    return NextResponse.json(candidateManagement, { status: 201 });
  } catch (error) {
    return NextResponse.json({ 
      error: `Error al crear el registro: ${error}` 
    }, { status: 500 });
  }
}