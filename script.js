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
      const uploadResponse = await fetch('https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3', {
        method: 'POST',
        body: JSON.stringify({
          action: 'GEMINI_FILE_UPLOAD',
          fileSize: file.size,
          mimeType: file.type
        })
      });

      const uploadData = await uploadResponse.json();
      if (!uploadData.success) {
        throw new Error('Erreur lors de l\'upload du fichier');
      }

      const uploadUrl = uploadData.results[0].upload_url;

      // Étape 2 : Envoi du fichier
      const formData = new FormData();
      formData.append('file', file);

      const uploadFileResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      const fileData = await uploadFileResponse.json();
      const fileUri = fileData.file.uri;

      // Étape 3 : Analyse avec Gemini
      const analyzeResponse = await fetch('https://n8n.tools.intelligenceindustrielle.com/webhook/6852d509-086a-4415-a48c-ca72e7ceedb3', {
        method: 'POST',
        body: JSON.stringify({
          action: 'GEMINI_FILE_ANALYZE',
          prompt: `Analyse cette vidéo et génère un guide d'instructions détaillé. ${customInstructions}`,
          uri: fileUri
        })
      });

      const analyzeData = await analyzeResponse.json();
      if (!analyzeData.success) {
        throw new Error('Erreur lors de l\'analyse de la vidéo');
      }

      // Afficher le résultat
      resultZone.classList.remove('hidden');
      resultContent.textContent = analyzeData.results[0].gemini_response;
      showSuccess('Instructions générées avec succès !');

    } catch (error) {
      showError(error.message);
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