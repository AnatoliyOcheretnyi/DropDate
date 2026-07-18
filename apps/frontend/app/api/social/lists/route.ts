import { NextRequest, NextResponse } from "next/server";
const BACKEND = "http://localhost:8080";
async function forward(request:NextRequest){const response=await fetch(new URL("/social/lists",process.env.BACKEND_URL||BACKEND),{method:request.method,headers:{authorization:request.headers.get("authorization")||"","content-type":"application/json"},body:request.method==="POST"?await request.text():undefined,cache:"no-store"});return NextResponse.json(await response.json(),{status:response.status});}
export async function GET(r:NextRequest){try{return await forward(r)}catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Бекенд недоступний"},{status:502})}}
export async function POST(r:NextRequest){return GET(r)}
