"use client";
import Image from "next/image";
import {useUser} from "@/providers/user";

export default function Home() {
  
  const user = useUser().user;
  console.log(user);
  
  return (
    <>qa</>
  );
}
