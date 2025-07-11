// utils/formatResponse.js

/**
 * Send a standardized JSON response.
 *
 * @param {Express.Response} res
 * @param {boolean} success
 * @param {string} message
 * @param {object|number} [dataOrStatus]  If an object: treated as payload; if a number: treated as status code.
 * @param {number} [maybeStatus]          If dataOrStatus is payload, this is the HTTP status (default 200).
 */
function formatResponse(res, success, message, dataOrStatus, maybeStatus) {
  let status, payload;

  if (typeof dataOrStatus === 'number') {
    status  = dataOrStatus;
    payload = null;
  } else {
    payload = dataOrStatus || null;
    status  = maybeStatus || 200;
  }

  const body = { success, message };
  if (payload !== null) {
    body.data = payload;
  }

  return res.status(status).json(body);
}

module.exports = formatResponse;
