// Selección de elementos DOM
const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const albumArt = document.getElementById('album-art');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const progressBar = document.querySelector('.progress-bar');
const progress = document.getElementById('progress');
const progressThumb = document.getElementById('progress-thumb');
const volumeIcon = document.getElementById('volume-icon');
const volumeBar = document.querySelector('.volume-bar');
const volumeProgress = document.getElementById('volume-progress');
const volumeThumb = document.getElementById('volume-thumb');
const fileUpload = document.getElementById('file-upload');
const playlist = document.getElementById('playlist');
const playlistBtn = document.getElementById('playlist-btn');
const playlistContainer = document.getElementById('playlist-container');

// Estado del reproductor
let isPlaying = false;
let currentSongIndex = -1;
let songs = [];
let isDraggingProgress = false;
let isDraggingVolume = false;

// Inicialización
function init() {
    // Configurar volumen inicial
    audioPlayer.volume = 1.0;
    updateVolumeUI();

    // Event listeners para los controles de reproducción
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);

    // Event listeners para la barra de progreso
    progressBar.addEventListener('mousedown', startDraggingProgress);
    document.addEventListener('mousemove', updateProgressDrag);
    document.addEventListener('mouseup', stopDraggingProgress);
    progressBar.addEventListener('click', seekToPosition);

    // Event listeners para el control de volumen
    volumeBar.addEventListener('mousedown', startDraggingVolume);
    document.addEventListener('mousemove', updateVolumeDrag);
    document.addEventListener('mouseup', stopDraggingVolume);
    volumeBar.addEventListener('click', changeVolume);
    volumeIcon.addEventListener('click', toggleMute);

    // Event listeners para la carga de archivos
    fileUpload.addEventListener('change', handleFileUpload);

    // Event listeners para el audio
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', handleSongEnd);
    audioPlayer.addEventListener('loadedmetadata', updateDuration);

    // Event listener para el botón de la lista de reproducción
    playlistBtn.addEventListener('click', togglePlaylist);

    // Event listeners para dispositivos táctiles (responsive)
    progressBar.addEventListener('touchstart', handleProgressTouch);
    volumeBar.addEventListener('touchstart', handleVolumeTouch);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
}

// Función para formatear el tiempo en minutos:segundos
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Funciones de reproducción
function togglePlay() {
    if (currentSongIndex === -1 && songs.length > 0) {
        // Si no hay canción seleccionada pero hay canciones en la lista, reproducir la primera
        playSong(0);
        return;
    }

    if (isPlaying) {
        audioPlayer.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audioPlayer.play();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
    isPlaying = !isPlaying;
}

function playSong(index) {
    if (index < 0 || index >= songs.length) return;

    currentSongIndex = index;
    const song = songs[index];

    // Actualizar información de la canción
    songTitle.textContent = song.name;
    songArtist.textContent = song.artist || 'Artista desconocido';

    // Crear URL para el archivo de audio
    const audioUrl = URL.createObjectURL(song.file);
    audioPlayer.src = audioUrl;

    // Generar portada del álbum o usar placeholder
    if (song.artwork) {
        albumArt.src = song.artwork;
    } else {
        // Usar una imagen genérica con el nombre de la canción
        albumArt.src = `https://placehold.co/300x300/6c5ce7/FFFFFF?text=${encodeURIComponent(song.name.substring(0, 15))}`;
    }

    // Marcar la canción activa en la lista de reproducción
    updatePlaylistUI();

    // Antes de intentar reproducir, añadamos un log para depuración
    console.log("Intentando reproducir:", song.name);
    console.log("URL del audio:", audioUrl);
    
    // Añadir manejador de errores para la reproducción
    audioPlayer.onerror = function(e) {
        console.error("Error al reproducir el audio:", e);
        alert("Error al reproducir: " + song.name + ". Intenta con otro archivo de audio.");
    };

    // Intentar reproducir después de un pequeño retraso para asegurar que el src esté listo
    setTimeout(() => {
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Reproducción exitosa
                isPlaying = true;
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                console.log("Reproducción iniciada con éxito");
            })
            .catch(error => {
                // Error de reproducción - posiblemente política de autoplay
                console.error("Error en reproducción:", error);
                isPlaying = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
                alert("Para comenzar a reproducir, haz clic en el botón de play.");
            });
        }
    }, 100);
}

function playPrevious() {
    if (songs.length === 0) return;
    
    let newIndex;
    if (audioPlayer.currentTime > 3) {
        // Si han pasado más de 3 segundos, reiniciar la canción actual
        audioPlayer.currentTime = 0;
        return;
    } else {
        // De lo contrario, ir a la canción anterior
        newIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    }
    
    playSong(newIndex);
}

function playNext() {
    if (songs.length === 0) return;
    
    const newIndex = (currentSongIndex + 1) % songs.length;
    playSong(newIndex);
}

function handleSongEnd() {
    playNext();
}

// Funciones para la barra de progreso
function updateProgress() {
    if (isDraggingProgress) return;
    
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 1;
    const progressPercent = (currentTime / duration) * 100;
    
    progress.style.width = `${progressPercent}%`;
    progressThumb.style.left = `${progressPercent}%`;
    
    currentTimeEl.textContent = formatTime(currentTime);
}

function updateDuration() {
    durationEl.textContent = formatTime(audioPlayer.duration || 0);
}

function startDraggingProgress(e) {
    isDraggingProgress = true;
    updateProgressDrag(e);
}

function updateProgressDrag(e) {
    if (!isDraggingProgress) return;
    
    const rect = progressBar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    
    progress.style.width = `${clampedPosition * 100}%`;
    progressThumb.style.left = `${clampedPosition * 100}%`;
}

function stopDraggingProgress() {
    if (!isDraggingProgress) return;
    
    isDraggingProgress = false;
    
    const position = parseFloat(progress.style.width) / 100;
    audioPlayer.currentTime = position * audioPlayer.duration;
}

function seekToPosition(e) {
    const rect = progressBar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    
    progress.style.width = `${clampedPosition * 100}%`;
    progressThumb.style.left = `${clampedPosition * 100}%`;
    
    audioPlayer.currentTime = clampedPosition * audioPlayer.duration;
}

// Funciones para el control de volumen
function updateVolumeUI() {
    const volumePercent = audioPlayer.volume * 100;
    volumeProgress.style.width = `${volumePercent}%`;
    volumeThumb.style.right = `${100 - volumePercent}%`;
    
    // Actualizar icono de volumen
    if (audioPlayer.volume === 0) {
        volumeIcon.className = 'fas fa-volume-mute';
    } else if (audioPlayer.volume < 0.5) {
        volumeIcon.className = 'fas fa-volume-down';
    } else {
        volumeIcon.className = 'fas fa-volume-up';
    }
}

function startDraggingVolume(e) {
    isDraggingVolume = true;
    updateVolumeDrag(e);
}

function updateVolumeDrag(e) {
    if (!isDraggingVolume) return;
    
    const rect = volumeBar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    
    audioPlayer.volume = clampedPosition;
    updateVolumeUI();
}

function stopDraggingVolume() {
    isDraggingVolume = false;
}

function changeVolume(e) {
    const rect = volumeBar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    
    audioPlayer.volume = clampedPosition;
    updateVolumeUI();
}

function toggleMute() {
    if (audioPlayer.volume > 0) {
        audioPlayer.dataset.lastVolume = audioPlayer.volume;
        audioPlayer.volume = 0;
    } else {
        audioPlayer.volume = audioPlayer.dataset.lastVolume || 1;
    }
    updateVolumeUI();
}

// Funciones para la carga de archivos
function handleFileUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    console.log("Archivos seleccionados:", files.length);
    
    // Procesar cada archivo seleccionado
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log("Analizando archivo:", file.name, "Tipo:", file.type);
        
        // Verificar si es un archivo de audio
        if (!file.type.startsWith('audio/')) {
            console.warn("Archivo no es de tipo audio:", file.type);
            alert(`El archivo "${file.name}" no es un archivo de audio válido.`);
            continue;
        }
        
        // Extraer información del nombre del archivo
        let name = file.name.replace(/\.[^/.]+$/, ""); // Quitar extensión
        let artist = 'Desconocido';
        
        // Si el nombre contiene un guion, intentar separar artista y título
        if (name.includes(' - ')) {
            const parts = name.split(' - ');
            artist = parts[0].trim();
            name = parts[1].trim();
        }
        
        console.log("Canción detectada:", name, "por", artist);
        
        // Crear objeto de canción
        const song = {
            file: file,
            name: name,
            artist: artist,
            artwork: null
        };
        
        songs.push(song);
    }
    
    // Mostrar mensaje si se añadieron canciones
    if (songs.length > 0) {
        alert(`Se han añadido ${songs.length} canción(es) a la lista de reproducción.`);
    }
    
    // Actualizar lista de reproducción
    updatePlaylistUI();
    
    // Si no hay canción reproduciéndose, reproducir la primera canción añadida
    if (currentSongIndex === -1 && songs.length > 0) {
        playSong(0);
    }
    
    // Limpiar el input de archivos para permitir cargar el mismo archivo nuevamente
    fileUpload.value = "";
}

// Funciones para la lista de reproducción
function updatePlaylistUI() {
    // Limpiar lista de reproducción
    playlist.innerHTML = '';
    
    if (songs.length === 0) {
        playlist.innerHTML = '<li class="playlist-empty">No hay canciones añadidas.</li>';
        return;
    }
    
    // Agregar cada canción a la lista
    songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="song-title">${song.name}</div>
            <div class="song-duration">${song.artist}</div>
        `;
        
        if (index === currentSongIndex) {
            li.classList.add('active');
        }
        
        li.addEventListener('click', () => playSong(index));
        playlist.appendChild(li);
    });
}

function togglePlaylist() {
    playlistContainer.classList.toggle('active');
}

// Funciones para dispositivos táctiles
function handleProgressTouch(e) {
    e.preventDefault();
    isDraggingProgress = true;
    document.body.style.overflow = 'hidden'; // Prevenir desplazamiento mientras se arrastra
}

function handleVolumeTouch(e) {
    e.preventDefault();
    isDraggingVolume = true;
    document.body.style.overflow = 'hidden';
}

function handleTouchMove(e) {
    if (!isDraggingProgress && !isDraggingVolume) return;
    
    if (isDraggingProgress) {
        const rect = progressBar.getBoundingClientRect();
        const touch = e.touches[0];
        const position = (touch.clientX - rect.left) / rect.width;
        const clampedPosition = Math.max(0, Math.min(1, position));
        
        progress.style.width = `${clampedPosition * 100}%`;
        progressThumb.style.left = `${clampedPosition * 100}%`;
    }
    
    if (isDraggingVolume) {
        const rect = volumeBar.getBoundingClientRect();
        const touch = e.touches[0];
        const position = (touch.clientX - rect.left) / rect.width;
        const clampedPosition = Math.max(0, Math.min(1, position));
        
        audioPlayer.volume = clampedPosition;
        updateVolumeUI();
    }
}

function handleTouchEnd(e) {
    if (isDraggingProgress) {
        isDraggingProgress = false;
        const position = parseFloat(progress.style.width) / 100;
        audioPlayer.currentTime = position * audioPlayer.duration;
    }
    
    if (isDraggingVolume) {
        isDraggingVolume = false;
    }
    
    document.body.style.overflow = '';
}

// Inicializar reproductor
document.addEventListener('DOMContentLoaded', init);
