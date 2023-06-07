// 缓存请求
const cacheMap = new Map();

// 缓存请求状态
const cacheStatusMap = new Map();

// 重复请求的回调缓存池
const cacheCallbackArr = new Map();

const sendRequest = (url) => {
  const isCached = cacheMap.has(url);

  // 有缓存
  if (isCached) {
    // 判断接口状态
    const status = cacheStatusMap.get(url);
    // 完成状态
    if (status == 'done') {
      return Promise.resolve(cacheMap.get(url));
    }
    // 还在请求中
    if (status == 'pending') {
      return new Promise((resolve, reject) => {
        if (cacheCallbackArr.has(url)) {
          cacheCallbackArr.get(url).push({
            onSuccess: resolve,
            onError: reject,
          })
        } else {
          cacheCallbackArr.set(url, [{ onSuccess: resolve, onError: reject }])
        }
      })
    }
  }

  return fetch(url)
    .then((res) => {
      // 成功
      if (res.status == 200) {
        cacheStatusMap.set(url, 'done');
        cacheMap.set(url, res);
      } else { // 失败的
        cacheStatusMap.delete(url);
      }

      if (cacheCallbackArr.has(url)) {
        cacheCallbackArr.get(url).forEach(callback => {
          callback.onSuccess(res);
        })
        // 清除回调的缓存池
        cacheStatusMap.delete(url);
      }

      return res;
    })
    .catch((err) => {
      cacheStatusMap.delete(url);

      if (cacheCallbackArr.has(url)) {
        cacheCallbackArr.get(url).forEach(callback => {
          callback.onError(err);
        })
        // 清除回调的缓存池
        cacheStatusMap.delete(url);
      }

      return Promise.reject(err);
    })
}