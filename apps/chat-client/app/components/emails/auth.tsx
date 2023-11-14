export function html(params: { url: string; host: string }) {
    const { url, host } = params
  
    return `
    <html>
  
    <head>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
    
        body {
          font-family: 'Lato', sans-serif
        }
    
        .text-dark {
          color: #2d2d2d !important;
        }
    
        .container {
          padding: 10px 60px;
        }
    
        .bold {
          font-weight: bold;
        }
    
        .py {
          padding: 10px 0;
        }
    
        .text-center {
          text-align: center;
        }
    
        .bg-gray {
          background-color: #f2f2f2 !important;
        }
    
        @media only screen and (max-width: 600px) {
          .container {
            padding: 20px;
          }
        }
      </style>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    </head>
    
    <body>
    
      <div class="text-center container" style="padding-top: 30px;">
        <img style="padding-bottom: 20px;" src="https://ergonomicadesk.com/logo.png" width="60px" height="auto"
          alt="Company Logo">
        <h2 class="py">Empieza a chatiar</h2>
        <p class="py text-dark">Haz clic en el botón para iniciar tu sesión de usuario en el chat de ergonomica</p>
        <div style="padding: 20px;">
          <a href="${url}" target="_blank" class="text-dark"
            style="text-decoration: none; font-size: 18px; background-color: transparent; border: 2px solid rgba(147,197,253); padding: 10px 20px; font-weight: bold;">
            Iniciar Sesión
          </a>
        </div>
      </div>
      
    </body>
    
    </html>
  `
  }
  
  /** Email Text body (fallback for email clients that don't render HTML, e.g. feature phones) */
  export function text({ url, host }: { url: string; host: string }) {
    return `Sign in to ${host}\n${url}\n\n`
  }