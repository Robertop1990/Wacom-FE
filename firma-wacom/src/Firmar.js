import React, { useState, useEffect } from 'react';
import { wacomstu540 } from './wacomstu540';
import { saveImage, getImage, deleteImage } from './store/indexedDBUtils'

const Firmar = () => {
  const [buttonsImage, setButtonsImage] = useState(null);
  const [firmaImagen, setFirmaImagen] = useState(null);
  const [isIniciando, setIsIniciando] = useState(false);

  useEffect(() => {
    const loadButtonsImage = async () => {
      try {
        const savedImage = await getImage(1);
        if (savedImage && savedImage.byteLength > 0) {
          setButtonsImage(savedImage);
        } else {
          const newImageData = await crearImagenBotones();
          await saveImage(1, newImageData);
          setButtonsImage(newImageData);
        }
      } catch (error) {
        console.log('Imagen no encontrada, cargando nuevos botones...');

        // Aquí llamamos a la función para crear los botones si no los encontramos en IndexedDB
        const newImageData = await crearImagenBotones(); // Crea las imágenes con tu lógica

        // Guardamos la imagen en IndexedDB
        await saveImage(1, newImageData);
        setButtonsImage(newImageData);
      }
    };

    loadButtonsImage();
  }, []);

  const iniciarFirma = async () => {
    setIsIniciando(true);

    const wacomDevice = new wacomstu540();
    const puntosFirma = [];

    // Botones
    const buttonWidth  = 180;
    const buttonHeight = 60;
    const padding      = 20;
    const buttonY      = 480 - buttonHeight - padding;

    const botonCancelar = { x1: padding, x2: padding + buttonWidth, y1: buttonY,           y2: buttonY + buttonHeight };
    const botonLimpiar  = { x1: (800 - buttonWidth) / 2, x2: (800 - buttonWidth) / 2 + buttonWidth, y1: buttonY, y2: buttonY + buttonHeight };
    const botonAceptar  = { x1: 800 - buttonWidth - padding, x2: 800 - padding, y1: buttonY,    y2: buttonY + buttonHeight };

    // Definir el área de firma (solo la parte superior, sin incluir los botones)
    const areaFirma = { x1: 0, y1: 0, x2: 800, y2: 400 }; // Limitar el área para la firma

    let yaSePresionoBoton = false;

    wacomDevice.onAccept = async () => {
      console.log("✅ Firma aceptada");

      // Limpiar la pantalla después de aceptar
      await wacomDevice.clearScreen();

      // Procesar la firma y convertirla en imagen
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < puntosFirma.length; i++) {
        const punto = puntosFirma[i];
        if (i === 0) ctx.moveTo(punto.cx, punto.cy);
        else ctx.lineTo(punto.cx, punto.cy);
      }

      ctx.stroke();

      setFirmaImagen(canvas.toDataURL());
      await wacomDevice.disconnect();
    };

    wacomDevice.onCancel = async () => {
      console.log("❌ Firma cancelada");
      // Limpiar la pantalla después de aceptar
      await wacomDevice.clearScreen();
      setFirmaImagen(null);
      puntosFirma.length = 0;
      await wacomDevice.disconnect();
    };

    try {
      const dispositivos = await navigator.hid.getDevices();

      if (dispositivos.length === 0 && localStorage.getItem('wacomDevicePermiso') !== 'true') {
        alert("No hay dispositivos autorizados. Presiona el botón para autorizar.");
        setIsIniciando(false);
        return;
      }

      if (!(await wacomDevice.checkAvailable())) {
        alert("Dispositivo no disponible.");
        setIsIniciando(false);
        return;
      }

      if (!(await wacomDevice.connect())) {
        alert("No se pudo conectar al dispositivo.");
        return;
      }

      await wacomDevice.clearScreen();
      await enviarImagenBotones(wacomDevice);

      // Escuchamos el evento penData
      wacomDevice.onPenData(async (data) => {
        const { cx, cy, press } = data;

        // Solo actuamos cuando el usuario toque (press > 0)
        if (press <= 0) return;

        // Detectamos sobre qué botón está
        const sobreLimpiar  = cx >= botonLimpiar.x1  && cx <= botonLimpiar.x2  && cy >= botonLimpiar.y1  && cy <= botonLimpiar.y2;
        const sobreAceptar  = cx >= botonAceptar.x1  && cx <= botonAceptar.x2  && cy >= botonAceptar.y1  && cy <= botonAceptar.y2;
        const sobreCancelar = cx >= botonCancelar.x1 && cx <= botonCancelar.x2 && cy >= botonCancelar.y1 && cy <= botonCancelar.y2;
        const enFirma       = cx >= areaFirma.x1     && cx <= areaFirma.x2     && cy >= areaFirma.y1      && cy <= areaFirma.y2;

        // 1) Botón LIMPIAR
        if (sobreLimpiar && !yaSePresionoBoton) {
          yaSePresionoBoton = true;
          console.log("🔄 Limpiar presionado");
          puntosFirma.length = 0;
          await wacomDevice.clearScreen();
          await enviarImagenBotones(wacomDevice);
          yaSePresionoBoton = false; // permitimos nuevas pulsaciones
          return;
        }

        // 2) Botón ACEPTAR
        if (sobreAceptar && !yaSePresionoBoton) {
          yaSePresionoBoton = true;
          wacomDevice.onAccept();
          setIsIniciando(false);
          return;
        }

        // 3) Botón CANCELAR
        if (sobreCancelar && !yaSePresionoBoton) {
          yaSePresionoBoton = true;
          wacomDevice.onCancel();
          setIsIniciando(false);
          return;
        }

        // 4) EN ZONA DE FIRMA
        if (enFirma && !sobreLimpiar && !sobreAceptar && !sobreCancelar) {
          puntosFirma.push({ cx, cy });
        }
      });
    } catch (error) {
      console.error("Error al conectar el dispositivo:", error);
    } finally {
      //setIsIniciando(false);
    }
  };

  async function enviarImagenBotones(wacomDevice) {
    await wacomDevice.setImage(buttonsImage);
  }

  function crearImagenBotones() {
    const width = 800;
    const height = 480;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Fondo blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Datos comunes para los botones
    const buttonWidth = 180;
    const buttonHeight = 60;
    const padding = 20;

    const cancelX = padding;
    const clearX = (width - buttonWidth) / 2;
    const acceptX = width - buttonWidth - padding;
    const buttonY = height - buttonHeight - padding;
  
    // Botón Cancelar
    drawButtonWithGradientAndShadow(
      ctx,
      cancelX,
      buttonY,
      buttonWidth,
      buttonHeight,
      "#ff5c5c",
      "#cc0000",
      "Cancelar",
      "✖️"
    );

    // Botón Limpiar
    drawButtonWithGradientAndShadow(
      ctx,
      clearX,
      buttonY,
      buttonWidth,
      buttonHeight,
      "#ffe066",
      "#ffcc00",
      "Limpiar",
      "🗑️"
    );

    // Botón Aceptar
    drawButtonWithGradientAndShadow(
      ctx,
      acceptX,
      buttonY,
      buttonWidth,
      buttonHeight,
      "#66ff66",
      "#00cc00",
      "Aceptar",
      "✔️"
    );

    // Enviar la imagen al dispositivo
    const imageData = ctx.getImageData(0, 0, width, height);
    const rgba = imageData.data;

    const bgr = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      bgr[j] = rgba[i + 2];
      bgr[j + 1] = rgba[i + 1];
      bgr[j + 2] = rgba[i];
    }

    return bgr;
  }

  // Dibujar botón con sombra + degradado
  function drawButtonWithGradientAndShadow(ctx, x, y, width, height, colorTop, colorBottom, label, icon) {
    const radius = 15;

    // === Sombra ===
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)"; // Color de la sombra
    ctx.shadowBlur = 10; // Difuminado
    ctx.shadowOffsetX = 3; // Desplazamiento X
    ctx.shadowOffsetY = 3; // Desplazamiento Y

    // === Fondo con gradiente ===
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, colorTop);
    gradient.addColorStop(1, colorBottom);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore(); // Quitar sombra para dibujar los demás elementos

    // === Borde blanco ===
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();

    // === Icono ===
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(icon, x + width / 4, y + height / 2 + 10);

    // === Texto ===
    ctx.font = "18px Arial";
    ctx.fillText(label, x + (3 * width) / 4, y + height / 2 + 8);
  }

  return (
    <div>
      <h1>Captura de Firma</h1>
      <button
        disabled={isIniciando}
        onClick={iniciarFirma}
      >
        {isIniciando ? "Iniciando..." : "Iniciar Firma"}
      </button>

      {firmaImagen && (
        <div>
          <h2>Firma capturada:</h2>
          <img src={firmaImagen} alt="Firma capturada" style={{ border: "1px solid #ccc" }} />
        </div>
      )}
    </div>
  );
};

export default Firmar;