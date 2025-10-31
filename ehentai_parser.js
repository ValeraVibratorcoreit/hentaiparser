(function () {
    'use strict';

































    function start() {
        console.log('Hentai Ocean Parser плагин запущен!');

        // Добавляем новый пункт меню в левую панель
        if (Lampa.Settings.main && Lampa.Settings.main() && !Lampa.Settings.main().render().find('[data-component="valeravibrator"]').length) {
            const html = Lampa.Utils.html(`<div class="settings-folder selector" data-component="valeravibrator">
                <div class="settings-folder__icon">
                    <svg height="46" viewBox="0 0 42 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1.5" y="26.5" width="39" height="18" rx="1.5" stroke="white" stroke-width="3"/>
                    <circle cx="9.5" cy="35.5" r="3.5" fill="white"/>
                    <circle cx="26.5" cy="35.5" r="2.5" fill="white"/>
                    <circle cx="32.5" cy="35.5" r="2.5" fill="white"/>
                    <circle cx="21.5" cy="5.5" r="5.5" fill="white"/>
                    <rect x="31" y="4" width="11" height="3" rx="1.5" fill="white"/>
                    <rect y="4" width="11" height="3" rx="1.5" fill="white"/>
                    <rect x="20" y="14" width="3" height="7" rx="1.5" fill="white"/>
                    </svg>
                </div>
                <div class="settings-folder__name">Hentai Ocean</div>
            </div>`);

            Lampa.Settings.main().render().find('[data-component="more"]').after(html);
            Lampa.Settings.main().update();
        }

        Lampa.Component.add('valeravibrator', function() {
            var component = new Lampa.Component({
                name: 'valeravibrator',
                template: `
                    <div class="hentaiocean-parser">
                        <div class="hentaiocean-parser__head">
                            <h2 class="hentaiocean-parser__title">Hentai Ocean Видео <span v-if="currentQuery"> (Поиск: "{{ currentQuery }}")</span></h2>
                        </div>
                        <div class="hentaiocean-parser__content">
                            <div class="hentaiocean-parser__loading" v-if="loading">Загрузка видео...</div>
                            <div class="hentaiocean-parser__error" v-if="error">{{ error }}</div>
                            <div class="hentaiocean-parser__list" v-if="!loading && !error">
                                <div class="hentaiocean-parser__item" v-for="video in videos" :key="video.guid">
                                    <img :src="video.thumbnail" :alt="video.title" class="hentaiocean-parser__thumb">
                                    <div class="hentaiocean-parser__title">{{ video.title }}</div>
                                    <div class="hentaiocean-parser__category">{{ video.category }}</div>
                                </div>
                            </div>
                            <div class="hentaiocean-parser__load-more" v-if="videos.length > 0 && !loading && !error && !currentQuery">
                                <button @click="loadMore" class="hentaiocean-parser__load-more-button">Загрузить ещё</button>
                            </div>
                        </div>
                    </div>
                `,
                data: function() {
                    return {
                        videos: [], // Список видео
                        allVideos: [], // Все загруженные видео для клиентского поиска
                        loading: true,
                        error: null,
                        page: 0, // Текущая страница для пагинации (для RSS может быть неактуально, но оставим для структуры)
                        currentQuery: null // Текущий поисковый запрос
                    };
                },
                methods: {
                    create: function(params) {
                        this.loadVideos(params); // Load videos on component creation
                    },
                    parseRSS: function(xmlString) {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
                        const items = xmlDoc.querySelectorAll("item");
                        const videos = [];

                        items.forEach(item => {
                            const title = item.querySelector("title").textContent;
                            const link = item.querySelector("link").textContent;
                            const guid = item.querySelector("guid").textContent;
                            const description = item.querySelector("description").textContent; // This might contain HTML
                            // Extract thumbnail from description or another tag if available
                            const thumbnailMatch = description.match(/src="(.*?)"/);
                            const thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

                            // Basic category extraction (could be improved)
                            const categoryMatch = description.match(/Category: <b>(.*?)<\/b>/);
                            const category = categoryMatch ? categoryMatch[1] : 'Unknown';

                            videos.push({
                                title: title,
                                url: link,
                                guid: guid,
                                thumbnail: thumbnail,
                                description: description,
                                category: category,
                            });
                        });
                        return videos;
                    },
                    loadVideos: async function(params = {}) {
                        this.loading = true;
                        this.error = null;
                        this.currentQuery = params.query || null;

                        try {
                            const response = await fetch('https://hentaiocean.com/rss.xml');
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            const xmlText = await response.text();
                            const parsedVideos = this.parseRSS(xmlText);

                            this.allVideos = parsedVideos; // Store all videos for searching

                            if (this.currentQuery) {
                                this.videos = this.allVideos.filter(video =>
                                    video.title.toLowerCase().includes(this.currentQuery.toLowerCase()) ||
                                    video.description.toLowerCase().includes(this.currentQuery.toLowerCase()) ||
                                    video.category.toLowerCase().includes(this.currentQuery.toLowerCase())
                                );
                            } else {
                                this.videos = this.allVideos; // Display all if no search query
                            }

                        } catch (e) {
                            this.error = 'Ошибка при загрузке видео: ' + e.message;
                            console.error('Hentai Ocean API request failed:', e);
                        } finally {
                            this.loading = false;
                        }
                    },
                    loadMore: function() {
                        // Для RSS, мы обычно загружаем все сразу или обрабатываем серверную пагинацию.
                        // Поскольку Hentai Ocean RSS является единой лентой, loadMore может быть неприменим напрямую,
                        // если мы выполняем клиентскую фильтрацию.
                        Lampa.Noty.show('Все доступные видео загружены!');
                    },
                    search: async function(_object, kinopoisk_id, data) {
                        const query = _object.search || (_object.movie ? _object.movie.title : '');
                        if (!query) {
                            console.warn('Hentai Ocean Search: Отсутствует поисковый запрос.');
                            return [];
                        }

                        // Если видео еще не загружены, загрузим их
                        if (this.allVideos.length === 0) {
                           await this.loadVideos({ query: query });
                        } else {
                            // Иначе просто отфильтруем уже загруженные
                            this.currentQuery = query;
                            this.videos = this.allVideos.filter(video =>
                                video.title.toLowerCase().includes(query.toLowerCase()) ||
                                video.description.toLowerCase().includes(query.toLowerCase()) ||
                                video.category.toLowerCase().includes(query.toLowerCase())
                            );
                        }

                        // Форматируем результаты в формат, который Lampa.app ожидает для поиска
                        const formattedResults = this.videos.map(video => ({
                            title: video.title,
                            poster: video.thumbnail,
                            url: video.url,
                            type: 'hentaiocean_video',
                            description: video.category, // Используем категорию как описание
                        }));
                        return formattedResults;
                    },
                    start: function() {
                        // Логика запуска компонента
                    },
                    stop: function() {
                        // Логика остановки компонента
                    },
                    destroy: function() {
                        // Логика уничтожения компонента
                    }
                }
            });
            return component;
        });
    }

    // Регистрация плагина при полной загрузке Lampa
    if (window.Lampa) {
        start();
    } else {
        document.addEventListener('lampaready', start);
    }

})();
