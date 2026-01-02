'use client'
import { UploadPdfReport } from '@/components/searchCompanies';


export default function Home() {

  return (
    <section className="w-full h-screen flex flex-col bg-white items-center overflow-x-hidden">
      <UploadPdfReport />
    </section>
  );
}



