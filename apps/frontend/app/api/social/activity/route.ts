import { NextRequest, NextResponse } from "next/server";
const BACKEND = "http://localhost:8080";
export async function GET(request: NextRequest) { try { const response=await fetch(new URL("/social/activity",process.env.BACKEND_URL||BACKEND),{headers:{authorization:request.headers.get("authorization")||""},cache:"no-store"});return NextResponse.json(await response.json(),{status:response.status}); } catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Бекенд недоступний"},{status:502});} }
