(async () => {

    const HOT_SORT__DEFAULT = 'default';
    const HOT_SORT__CREATED = 'created';
    const HOT_SORT__REWARD = 'reward';
    const HOT_SORT_OPTIONS = [
        HOT_SORT__DEFAULT,
        HOT_SORT__CREATED,
        HOT_SORT__REWARD,
    ];

    const STREAM_FOLLOWING = 'following';
    const STREAM_HOT = 'hot';
    const STREAM_POSTS = 'postList';
    const STREAM_REPOSTS = 'repostList';
    const STREAM_SEARCH = 'search';

    const mostRecentFeeds = {
        [STREAM_FOLLOWING]: [],
        [STREAM_HOT]: [],
        [STREAM_POSTS]: [],
        [STREAM_REPOSTS]: [],
        [STREAM_SEARCH]: [],
    };

    const getConfig = () => {
        let hotSortBy = HOT_SORT__DEFAULT;
        let excludeOfficialAccounts = false;
        let excludeNonFollowing = false;
        let excludeReposts = false;
        let onlyDraws = false;
        let hideJoinedDraws = false;
        let excludePaidPostsFromFollowing = false;
        let excludePaidPostsFromHot = false;
        let excludeBlacklistedWordsFromFollowing = false;
        let excludeBlacklistedWordsFromHot = false;
        let blacklistedWords = [];
        let notTrustedFirst = false;

        try {
            const config = JSON.parse(localStorage.getItem('__debank_extension'));

            if (HOT_SORT_OPTIONS.includes(config.hotSortBy)) {
                hotSortBy = config.hotSortBy;
            }

            if ([true, false].includes(config.excludeOfficialAccounts)) {
                excludeOfficialAccounts = config.excludeOfficialAccounts;
            }

            if ([true, false].includes(config.excludeNonFollowing)) {
                excludeNonFollowing = config.excludeNonFollowing;
            }

            if ([true, false].includes(config.excludeReposts)) {
                excludeReposts = config.excludeReposts;
            }

            if ([true, false].includes(config.onlyDraws)) {
                onlyDraws = config.onlyDraws;
            }

            if([true, false].includes(config.hideJoinedDraws)) {
                hideJoinedDraws = config.hideJoinedDraws;
            }

            if ([true, false].includes(config.hideJoinedDraws)) {
                hideJoinedDraws = config.hideJoinedDraws;
            }

            if ([true, false].includes(config.excludePaidPostsFromFollowing)) {
                excludePaidPostsFromFollowing = config.excludePaidPostsFromFollowing;
            }

            if ([true, false].includes(config.excludePaidPostsFromHot)) {
                excludePaidPostsFromHot = config.excludePaidPostsFromHot;
            }

            if ([true, false].includes(config.excludeBlacklistedWordsFromFollowing)) {
                excludeBlacklistedWordsFromFollowing = config.excludeBlacklistedWordsFromFollowing;
            }

            if ([true, false].includes(config.excludeBlacklistedWordsFromHot)) {
                excludeBlacklistedWordsFromHot = config.excludeBlacklistedWordsFromHot;
            }

            if ([true, false].includes(config.notTrustedFirst)) {
                notTrustedFirst = config.notTrustedFirst;
            }

            if (Array.isArray(config.blacklistedWords)) {
                blacklistedWords = config.blacklistedWords;
            }
        } catch {
            //
        }

        const lowerCasedBlacklistedWords = blacklistedWords.map(w => w.toLowerCase());

        return {
            hotSortBy,
            excludeOfficialAccounts,
            excludeNonFollowing,
            excludeReposts,
            onlyDraws,
            hideJoinedDraws,
            excludePaidPostsFromFollowing,
            excludePaidPostsFromHot,
            excludeBlacklistedWordsFromFollowing,
            excludeBlacklistedWordsFromHot,
            blacklistedWords,
            lowerCasedBlacklistedWords,
            notTrustedFirst,
        };
    };

    const setConfig = (partialConfig) => {
        const newConfig = getConfig();

        if (HOT_SORT_OPTIONS.includes(partialConfig.hotSortBy)) {
            newConfig.hotSortBy = partialConfig.hotSortBy;
        }

        if ([true, false].includes(partialConfig.excludeOfficialAccounts)) {
            newConfig.excludeOfficialAccounts = partialConfig.excludeOfficialAccounts;
        }

        if ([true, false].includes(partialConfig.excludeNonFollowing)) {
            newConfig.excludeNonFollowing = partialConfig.excludeNonFollowing;
        }

        if ([true, false].includes(partialConfig.excludeReposts)) {
            newConfig.excludeReposts = partialConfig.excludeReposts;
        }

        if ([true, false].includes(partialConfig.onlyDraws)) {
            newConfig.onlyDraws = partialConfig.onlyDraws;
        }

        if ([true, false].includes(partialConfig.hideJoinedDraws)) {
            newConfig.hideJoinedDraws = partialConfig.hideJoinedDraws;
        }

        if ([true, false].includes(partialConfig.excludePaidPostsFromFollowing)) {
            newConfig.excludePaidPostsFromFollowing = partialConfig.excludePaidPostsFromFollowing;
        }

        if ([true, false].includes(partialConfig.excludePaidPostsFromHot)) {
            newConfig.excludePaidPostsFromHot = partialConfig.excludePaidPostsFromHot;
        }

        if ([true, false].includes(partialConfig.excludeBlacklistedWordsFromFollowing)) {
            newConfig.excludeBlacklistedWordsFromFollowing = partialConfig.excludeBlacklistedWordsFromFollowing;
        }

        if ([true, false].includes(partialConfig.excludeBlacklistedWordsFromHot)) {
            newConfig.excludeBlacklistedWordsFromHot = partialConfig.excludeBlacklistedWordsFromHot;
        }

        if ([true, false].includes(partialConfig.notTrustedFirst)) {
            newConfig.notTrustedFirst = partialConfig.notTrustedFirst;
        }

        if (Array.isArray(partialConfig.blacklistedWords)) {
            newConfig.blacklistedWords = partialConfig.blacklistedWords;
        }

        localStorage.setItem('__debank_extension', JSON.stringify(newConfig));
    };

    const shouldBeBlacklisted = (article, lowerCasedBlacklistedWords) => {
        const content = article.content.toLowerCase();
        const isLuckyDrawBlacklisted =
            lowerCasedBlacklistedWords.includes('lucky draw') ||
            lowerCasedBlacklistedWords.includes('luckydraw');

        if (isLuckyDrawBlacklisted && article.type === 'draw') {
            return true;
        }

        if (lowerCasedBlacklistedWords.some(word => content.includes(word))) {
            return true;
        }

        return false;
    };

    const saveMostRecentFeeds = (url, streamType, feeds) => {
        const create_at = new URL(url).searchParams.get('create_at');
        const start = new URL(url).searchParams.get('start');
        const isFirstPage = !create_at && (!start || start === '0');
        const feedsFiltered = feeds.filter(feed => feed?.article?.is_visible);

        if (isFirstPage) {
            mostRecentFeeds[streamType] = feedsFiltered;
        } else {
            mostRecentFeeds[streamType] = [
                ...mostRecentFeeds[streamType],
                ...feedsFiltered,
            ];
        }
    };

    const swapRequestResult = (response, transformResponseFn) => {
        response.json = () =>
            response
                .clone()
                .json()
                .then(response => {
                    try {
                        return transformResponseFn(response);
                    } catch {
                        return response;
                    }
                });

        return response;
    };

    const modifyHotResponse = (response) => {
        return swapRequestResult(response, result => {
            const {
                hotSortBy,
                excludeOfficialAccounts,
                excludeNonFollowing,
                excludePaidPostsFromHot,
                excludeBlacklistedWordsFromHot,
                lowerCasedBlacklistedWords,
                notTrustedFirst,
                onlyDraws,
                hideJoinedDraws,
            } = getConfig();

            result.data.feeds.sort((a, b) => {
                switch (hotSortBy) {
                    case HOT_SORT__CREATED:
                        return b.article.create_at - a.article.create_at;
                    case HOT_SORT__REWARD:
                        return b.article.reward_usd_value - a.article.reward_usd_value;
                    default:
                        return 0;
                }
            });

            if (notTrustedFirst) {
                result.data.feeds.sort((a, b) => {
                    return a.article.is_trust - b.article.is_trust;
                });
            }

            const feeds = result.data.feeds
                .filter(feed => {
                    const { article } = feed;
                    const { creator } = article;

                    if (excludeBlacklistedWordsFromHot) {
                        if (shouldBeBlacklisted(article, lowerCasedBlacklistedWords)) {
                            return false;
                        }
                    }

                    if (excludeOfficialAccounts) {
                        if (
                            typeof creator.verify_status === 'number' &&
                            !creator.is_following
                        ) {
                            return false;
                        }
                    }

                    if (excludeNonFollowing) {
                        if (!creator.is_following) {
                            return false;
                        }
                    }

                    if (excludePaidPostsFromHot) {
                        if (article.price && !article.is_paid) {
                            return false;
                        }
                    }

                    // Hide posts from sybils without any settings
                    if (creator.desc) {
                        if (
                            creator.desc.is_danger ||
                            creator.desc.is_restricted ||
                            creator.desc.is_scam ||
                            creator.desc.is_spam ||
                            creator.desc.is_muted
                        ) {
                            return false;
                        }
                    }

                    if (onlyDraws) {
                        if (feed.article.type !== 'draw' || feed.article.draw?.is_settled) {
                            return false;
                        }
                    }

                    if (hideJoinedDraws) {
                        if (feed.article.type === 'draw' && feed.article.draw?.is_joined) {
                            return false;
                        }
                    }

                    return true;
                })
                .map(feed => {
                    return feed;
                });

            saveMostRecentFeeds(response.url, STREAM_HOT, feeds);

            return {
                ...result,
                data: {
                    ...result.data,
                    feeds,
                }
            };
        });
    };

    const modifyFollowingResponse = (response) => {
        return swapRequestResult(response, result => {
            const {
                excludeReposts,
                onlyDraws,
                hideJoinedDraws,
                excludePaidPostsFromFollowing,
                excludeBlacklistedWordsFromFollowing,
                lowerCasedBlacklistedWords,
            } = getConfig();

            let feeds = result.data.feeds.map(feed => {
                if (excludeBlacklistedWordsFromFollowing) {
                    if (shouldBeBlacklisted(feed.article, lowerCasedBlacklistedWords)) {
                        return {
                            article: {
                                create_at: feed.article.create_at,
                            }
                        };
                    }
                }

                if (excludeReposts) {
                    if (feed.repost_list.length > 0) {
                        return {
                            article: {
                                create_at: feed.article.create_at,
                            }
                        };
                    }
                }

                if (onlyDraws) {
                    if (feed.article.type !== 'draw' || feed.article.draw?.is_settled) {
                        return {
                            article: {
                                create_at: feed.article.create_at,
                            }
                        };
                    }
                }

                if (hideJoinedDraws) {
                    if (feed.article.type === 'draw' && feed.article.draw?.is_joined) {
                        return {
                            article: {
                                create_at: feed.article.create_at,
                            }
                        };
                    }
                }

                if (excludePaidPostsFromFollowing) {
                    if (feed.article.price && !feed.article.is_paid) {
                        return {
                            article: {
                                create_at: feed.article.create_at,
                            }
                        };
                    }
                }

                return feed;
            });
            if (feeds.filter(feed => !!feed.article.id).length === 0) {
                feeds[0] = result.data.feeds[0];
            }
            saveMostRecentFeeds(response.url, STREAM_FOLLOWING, feeds);

            return {
                ...result,
                data: {
                    ...result.data,
                    feeds,
                }
            };
        });
    };

    const modifyPostListResponse = (response) => {
        return swapRequestResult(response, result => {
            saveMostRecentFeeds(response.url, STREAM_POSTS, result.data.post_list);
            return result;
        });
    };

    const modifyRepostListResponse = (response) => {
        return swapRequestResult(response, result => {
            saveMostRecentFeeds(response.url, STREAM_REPOSTS, result.data.repost_list);
            return result;
        });
    };

    const modifySearchResponse = (response) => {
        return swapRequestResult(response, result => {
            saveMostRecentFeeds(response.url, STREAM_SEARCH, result.data.feeds);
            return result;
        });
    };

    const tweakResponses = () => {
        const rawFetch = window.fetch;
        window.fetch = async (...args) => {
            const [url] = args;
            const response = await rawFetch(...args);

            if (url.startsWith('https://api.debank.com/feed/list')) {
                return modifyFollowingResponse(response);
            } else if (url.startsWith('https://api.debank.com/feed/hot_list')) {
                return modifyHotResponse(response);
            } else if (url.startsWith('https://api.debank.com/article/post_list')) {
                return modifyPostListResponse(response);
            } else if (url.startsWith('https://api.debank.com/article/repost_list')) {
                return modifyRepostListResponse(response);
            } else if (url.startsWith('https://api.debank.com/feed/search')) {
                return modifySearchResponse(response);
            }

            return response;
        };
    };

    const getCurrentStreamType = () => {
        const { href } = window.location;

        if (
            href === 'https://debank.com/stream' ||
            href === 'https://debank.com/stream?tab=following'
        ) {
            return STREAM_FOLLOWING;
        } else if (href === 'https://debank.com/stream?tab=hot') {
            return STREAM_HOT;
        } else if (/debank\.com\/profile\/(.*)\/stream\/?/.test(href)) {
            const value = document.querySelector('[class*="StreamTab_streamTab__"] .db-segmentedItem.isActive')?.dataset?.value;
            if (value === 'posted') return STREAM_POSTS;
            if (value === 'reposted') return STREAM_REPOSTS;
        } else if (/debank\.com\/stream(.*)[?&]tab=search/.test(href)) {
            return STREAM_SEARCH;
        }

        return null;
    };

    const getStreamIdByIndex = (streamType, index) => {
        return mostRecentFeeds[streamType]
            // some articles are intensionally broken so they aren't displayed on th stream
            // we have to skip their index
            .filter(({ article }) => article.id)
        [index].article.id;
    };

    const experimentalFeatures = () => {
        document.addEventListener('click', e => {
            if (!e.metaKey && !e.ctrlKey) return;

            // clicking the link in the post, we let DeBank process it
            if (typeof e.target.dataset.target === 'string') return;

            let streamType = getCurrentStreamType();
            let closestStreamItem;
            if (
                streamType === STREAM_POSTS ||
                streamType === STREAM_REPOSTS
            ) {
                closestStreamItem = e.target.closest('[class*="StreamTab_streamMain__"] [data-test-id="virtuoso-item-list"] > div');
            } else {
                closestStreamItem = e.target.closest('[class*="ListContainer_stream__"] [data-test-id="virtuoso-item-list"] > div');
            }

            if (!streamType || !closestStreamItem) return;

            const index = Number(closestStreamItem.dataset.index || closestStreamItem.dataset.itemIndex);
            if (index >= 0) {
                const streamId = getStreamIdByIndex(streamType, index);
                if (streamId) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`https://debank.com/stream/${streamId}`);
                }
            }
        }, true);
    };

    tweakResponses();
    experimentalFeatures();

    document.body.addEventListener('__debank_extension', (e) => {
        setConfig(e.detail.config);
    });

})();
