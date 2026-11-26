import Script from 'next/script'
import App from '../_components/runcty/App'
import { CLARITY_ENABLED } from '../_components/runcty/features'

export default function MobilePage() {
  return (
    <>
      {/* Analítica pausada hasta contar con el permiso del club (ver CLARITY_ENABLED). */}
      {CLARITY_ENABLED && (
      <Script id="runcty-clarity" strategy="afterInteractive">
        {`
          if (window.location.hostname === 'runcty-prototipo-web-movil.vercel.app') {
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "zjv9ghwc78");
          }
        `}
      </Script>
      )}
      <App initialExperience="mobile" />
    </>
  )
}
