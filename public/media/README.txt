Сюда кладутся видеофрагменты для блока «Сравнение озвучек» (остановка 5).

Имена файлов:
  masha-ru.mp4   masha-en.mp4   masha-es.mp4   masha-ar.mp4
Обложки (необязательно): masha-ru.webp и т. д.

После добавления откройте content/media.json, у нужного языка поставьте
"ready": true, впишите "source" и, если есть обложка, "poster": "media/masha-ru.webp".

Перед добавлением удалите из файлов метаданные (автор, программа, GPS):
  ffmpeg -i in.mp4 -map_metadata -1 -c copy masha-ru.mp4
Рекомендуется: 10–20 секунд, 720p, H.264, до 3–4 МБ на файл.
