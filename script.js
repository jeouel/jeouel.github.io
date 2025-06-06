document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const generateBtn = document.getElementById('generateBtn');
  const instructions = document.getElementById('instructions');
  const resultZone = document.getElementById('resultZone');
  const resultContent = document.getElementById('resultContent');

  // Gestion du drag & drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  function highlight(e) {
    dropZone.classList.add('dragover');
  }

  function unhighlight(e) {
    dropZone.classList.remove('dragover');
  }

  // Gestion du drop
  dropZone.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }

  // Gestion du clic sur la zone de drop
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        // Supprimer l'ancien message de fichier s'il existe
        const oldFileName = dropZone.querySelector('p');
        if (oldFileName) {
          oldFileName.remove();
        }

        // Afficher le nom du fichier
        const fileName = document.createElement('p');
        fileName.textContent = `Fichier sélectionné : ${file.name}`;
        fileName.className = 'text-sm text-gray-600 mt-2';
        dropZone.appendChild(fileName);

        // Activer le bouton de génération
        generateBtn.disabled = false;
      } else {
        showError('Veuillez sélectionner un fichier vidéo valide.');
      }
    }
  }

  // Fonction pour vérifier si une réponse est un JSON valide
  async function parseJSONResponse(response, step) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error(`Erreur de parsing JSON à l'étape ${step}:`, text);
      throw new Error(`Réponse invalide du serveur à l'étape ${step}. Réponse brute: ${text}`);
    }
  }

  // Fonction pour afficher les détails de l'erreur
  function showErrorDetails(error, step, responseData = null) {
    const errorDetails = document.createElement('div');
    errorDetails.className = 'error-details mt-2 text-sm';

    let details = `Étape: ${step}\n`;
    details += `Message: ${error.message}\n`;

    if (error.stack) {
      details += `Stack: ${error.stack}\n`;
    }

    if (responseData) {
      details += `Réponse du serveur: ${JSON.stringify(responseData, null, 2)}`;
    }

    errorDetails.textContent = details;
    return errorDetails;
  }

  // Gestion du bouton de génération
  generateBtn.addEventListener('click', async () => {
    if (!fileInput.files[0]) {
      showError('Veuillez sélectionner une vidéo.');
      return;
    }

    const file = fileInput.files[0];
    const customInstructions = instructions.value.trim();

    try {
      generateBtn.disabled = true;
      generateBtn.classList.add('loading');

      // Étape 1 : Upload du fichier
      console.log('Étape 1: Demande d\'URL d\'upload');
      const uploadResponse = await fetch('https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'GEMINI_FILE_UPLOAD',
          fileSize: file.size,
          mimeType: file.type
        })
      });

      const uploadData = await parseJSONResponse(uploadResponse, '1 - Demande d\'URL d\'upload');
      console.log('Réponse étape 1:', uploadData);

      if (!uploadData.success || !uploadData.results?.[0]?.upload_url) {
        throw new Error('Erreur lors de l\'upload du fichier');
      }

      const uploadUrl = uploadData.results[0].upload_url;

      // Étape 2 : Envoi du fichier
      console.log('Étape 2: Upload du fichier');
      const formData = new FormData();
      formData.append('file', file);

      const uploadFileResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      const fileData = await parseJSONResponse(uploadFileResponse, '2 - Upload du fichier');
      console.log('Réponse étape 2:', fileData);

      if (!fileData.file?.uri) {
        throw new Error('Erreur lors de l\'envoi du fichier');
      }

      const fileUri = fileData.file.uri;

      // Étape 3 : Analyse avec Gemini
      console.log('Étape 3: Analyse avec Gemini');
      const analyzeResponse = await fetch('https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'GEMINI_FILE_ANALYZE',
          prompt: `Analyse cette vidéo et génère un guide d'instructions détaillé. ${customInstructions}`,
          uri: fileUri
        })
      });

      const analyzeData = await parseJSONResponse(analyzeResponse, '3 - Analyse avec Gemini');
      console.log('Réponse étape 3:', analyzeData);

      if (!analyzeData.success || !analyzeData.results?.[0]?.gemini_response) {
        throw new Error('Erreur lors de l\'analyse de la vidéo');
      }

      // Afficher le résultat
      resultZone.classList.remove('hidden');
      resultContent.textContent = analyzeData.results[0].gemini_response;
      showSuccess('Instructions générées avec succès !');

    } catch (error) {
      console.error('Erreur complète:', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = error.message;

      // Ajouter les détails de l'erreur
      const errorDetails = showErrorDetails(error, 'Traitement de la vidéo');
      errorDiv.appendChild(errorDetails);

      resultZone.classList.remove('hidden');
      resultContent.innerHTML = '';
      resultContent.appendChild(errorDiv);
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
    }
  });

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    resultZone.classList.remove('hidden');
    resultContent.innerHTML = '';
    resultContent.appendChild(errorDiv);
  }

  function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    resultZone.classList.remove('hidden');
    resultContent.appendChild(successDiv);
  }
}); 