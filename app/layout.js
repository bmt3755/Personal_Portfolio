import './globals.css'
import Preloader from './Preloader'
import SmoothScroll from './SmoothScroll'

export const metadata = {
  title: 'Manjeera Thogarcheti — AI & Systems Lead',
  description: 'AI & Systems Lead specializing in production-grade multi-agent systems. LangGraph, CrewAI, OpenAI SDK. Human-in-the-loop by design.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Preloader />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  )
}
