import { NextRequest, NextResponse } from "next/server";
const BACKEND = "http://localhost:8080";
export async function POST(request:NextRequest){try{const response=await fetch(new URL("/social/recommendations",process.env.BACKEND_URL||BACKEND),{method:"POST",headers:{authorization:request.headers.get("authorization")||"","content-type":"application/json"},body:await request.text(),cache:"no-store"});return NextResponse.json(await response.json(),{status:response.status});}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Бекенд недоступний"},{status:502})}}
