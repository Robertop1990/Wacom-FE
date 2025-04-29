function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('myDatabase', 1);
  
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      };
  
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
  
      request.onerror = (event) => {
        reject('Error al abrir la base de datos');
      };
    });
  }
  
  // Guardar imagen en la base de datos
  function saveImage(imageId, imageData) {
    return new Promise((resolve, reject) => {
      openDatabase().then((db) => {
        const transaction = db.transaction('images', 'readwrite');
        const store = transaction.objectStore('images');
        const image = { id: imageId, data: imageData };
        const request = store.put(image);
  
        request.onsuccess = () => {
          resolve('Imagen guardada exitosamente');
        };
  
        request.onerror = () => {
          reject('Error al guardar la imagen');
        };
      }).catch(reject);
    });
  }
  
  // Recuperar imagen desde la base de datos
  function getImage(imageId) {
    return new Promise((resolve, reject) => {
      openDatabase().then((db) => {
        const transaction = db.transaction('images', 'readonly');
        const store = transaction.objectStore('images');
        const request = store.get(imageId);
  
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.data); // Devolver solo los datos de la imagen
          } else {
            reject('Imagen no encontrada');
          }
        };
  
        request.onerror = () => {
          reject('Error al recuperar la imagen');
        };
      }).catch(reject);
    });
  }
  
  // Eliminar imagen de la base de datos
  function deleteImage(imageId) {
    return new Promise((resolve, reject) => {
      openDatabase().then((db) => {
        const transaction = db.transaction('images', 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.delete(imageId);
  
        request.onsuccess = () => {
          resolve('Imagen eliminada exitosamente');
        };
  
        request.onerror = () => {
          reject('Error al eliminar la imagen');
        };
      }).catch(reject);
    });
  }
  
  // Exportar las funciones
  export { saveImage, getImage, deleteImage };