const { axios } = require("@pipedream/platform");
const crypto = require("crypto");
const events = require("./events.js");
const fields = require("./fields.js");
const mime = require("mime");

module.exports = {
  type: "app",
  app: "trello",
  description: "Pipedream Trello Components",
  propDefinitions: {
    cards: {
      type: "string[]",
      label: "Cards",
      description: "The Trello cards you wish to select",
      optional: true,
      async options(opts) {
        const cards = await this.getCards(opts.board);
        return cards.map((card) => ({
          label: card.name,
          value: card.id,
        }));
      },
    },
    board: {
      type: "string",
      label: "Board",
      description: "The Trello board you wish to select",
      async options() {
        const boards = await this.getBoards(this.$auth.oauth_uid);
        const activeBoards = boards.filter((board) => board.closed === false);
        return activeBoards.map((board) => ({
          label: board.name,
          value: board.id,
        }));
      },
    },
    boardFields: {
      type: "string",
      label: "Boards Fields",
      description: "`all` or a comma-separated list of board [fields](https://developer.atlassian.com/cloud/trello/guides/rest-api/object-definitions/#board-object)",
      options: fields.board,
      default: [
        "name", 
        "idOrganization"
      ],
    },
    cardFields: {
      type: "string[]",
      label: "Cards Fields",
      description: "`all` or a list of card [fields](https://developer.atlassian.com/cloud/trello/guides/rest-api/object-definitions/#card-object)",
      options: fields.card,
      default: [
        "all",
      ],
    },
    eventTypes: {
      type: "string[]",
      label: "Event Types",
      optional: true,
      description: "Only emit events for the selected event types (e.g., `updateCard`).",
      options: events,
    },
    lists: {
      type: "string[]",
      label: "Lists",
      description: "The Trello lists you wish to select",
      optional: true,
      async options(opts) {
        const lists = await this.getLists(opts.board);
        return lists.map((list) => ({
          label: list.name,
          value: list.id,
        }));
      },
    },
    query: {
      type: "string",
      label: "Query",
      description: "The search query with a length of 1 to 16384 characters",
    },
    idBoards: {
      type: "string",
      label: "Id Boards",
      description: "The special value `mine` or a comma-separated list of Board IDs where cards will be searched in",
      optional: true,
    },
    idOrganizations: {
      type: "string[]",
      label: "Id Organizations",
      description: "An string array of Organizations IDs where cards will be searched in",
      optional: true,
    },
    modelTypes: {
      type: "string",
      label: "Model Types",
      description: "The type or types of Trello objects you want to search. `all` or a comma-separated list of: `actions`, `boards`, `cards`, `members`, `organizations`",
      default: "all",
    },
    partial: {
      type: "boolean",
      label: "Partial Search?",
      description: "Specifying partial to be true means that Trello will search for content that starts with any of the words in `query`. When searching for an object titled \"My Development Status Report\", by default a solution is to search for \"Development\". If partial is enabled, a search for \"dev\" is possible, however, a search for \"velopment\" is not possible.",
      default: false,
    },
    label: {
      type: "string",
      label: "Label",
      description: "The ID of the Label to be added to the card",
      async options(opts) {
        const labels = await this.findLabel(opts.board);
        return labels.map((label) => ({
          label: label.name,
          value: label.id,
        }));
      },
    },
    member: {
      type: "string",
      label: "Member",
      description: "The ID of the Member to be added to the card",
      async options(opts) {
        const members = await this.listMembers(opts.board);
        return members.map((member) => ({
          label: member.fullName,
          value: member.id,
        }));
      },
    },
    checklist: {
      type: "string",
      label: "Checklist",
      description: "The ID of a checklist to copy into the new checklist",
      async options(opts) {
        const {
          board,
          card,
        } = opts;
        const checklists = card ?
          await this.listCardChecklists(card) :
          await this.listBoardChecklists(board);
        return checklists.map((checklist) => ({
          label: checklist.name,
          value: checklist.id,
        }));
      },
    },
    mimeType: {
      type: "string",
      label: "Mime Type",
      description: "The mimeType of the attachment. Not required for URL attachments",
      optional: true,
      options() {
        return Object.values(mime._types);
      },
    },
    name: {
      type: "string",
      label: "Name",
      description: "The name of the attachment",
      optional: true,
    },
    url: {
      type: "string",
      label: "File URL",
      description: "A URL to a file you'd like to attach. Must start with http:// or https://.",
    },
    desc: {
      type: "string",
      label: "Description",
      description: "The description for the card",
      optional: true,
    },
    pos: {
      type: "string",
      label: "Position",
      description: "The position of the new card. Valid values: `top`, `bottom`, or a positive float",
      optional: true,
    },
    due: {
      type: "string",
      label: "Due Date",
      description: "Card due date in ISO format",
      optional: true,
    },
    dueComplete: {
      type: "boolean",
      label: "Due Complete",
      description: "Flag that indicates if `dueDate` expired",
      optional: true,
    },
    address: {
      type: "string",
      label: "Address",
      description: "For use with/by the Map Power-Up",
      optional: true,
    },
    locationName: {
      type: "string",
      label: "Location Name",
      description: "For use with/by the Map Power-Up",
      optional: true,
    },
    coordinates: {
      type: "string",
      label: "Coordinates",
      description: "Latitude, longitude coordinates. For use with/by the Map Power-Up. Should take the form `lat, long`.",
      optional: true,
    },
    cardFilter: {
      type: "string",
      label: "Card Filter",
      description: "Filter to apply to Cards. Valid values: `all`, `closed`, `none`, `open`.",
      options() {
        return this.getFilterOptions();
      },
      default: "all",
    },
    listFilter: {
      type: "string",
      label: "List Filter",
      description: "Filter to apply to Lists. Valid values: `all`, `closed`, `none`, `open`.",
      options() {
        return this.getFilterOptions();
      },
      default: "all",
    },
  },
  methods: {
    _getBaseUrl() {
      return "https://api.trello.com/1/";
    },
    async _getAuthorizationHeader({
      data, method, url,
    }, $) {
      const requestData = {
        data,
        method,
        url,
      };
      const token = {
        key: this.$auth.oauth_access_token,
        secret: this.$auth.oauth_refresh_token,
      };
      return axios($ ?? this, {
        method: "POST",
        url: this.$auth.oauth_signer_uri,
        data: {
          requestData,
          token,
        },
      });
    },
    async _makeRequest(config, $) {
      const authorization = await this._getAuthorizationHeader(config, $);
      config.headers = {
        ...config.headers,
        authorization,
      };
      try {
        return await axios($ ?? this, config);
      } catch (err) {
        console.log(err);
      }
    },
    /**
     * Archives a card.
     *
     * @param {string}  idCard the ID of the Card to archive.
     * @returns an updated card object with `closed` (archived) property set to true.
     * See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-put
     */
    async archiveCard(idCard, $) {
      const config = {
        url: `${this._getBaseUrl()}/cards/${idCard}`,
        method: "PUT",
        data: {
          closed: true,
        },
      };
      return this._makeRequest(config, $);
    },
    /**
     * Adds an existing label to the specified card.
     *
     * @param {string}  idCard the ID of the Card to move.
     * @param {string}  params.value the ID of the Label that will be added to the Card.
     * @returns {array} an string array with the ID of all the Card's Labels.
     * See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-idlabels-post
     */
    async addAttachmentToCardViaUrl(idCard, params, $) {
      const config = {
        url: `${this._getBaseUrl()}cards/${idCard}/attachments`,
        method: "POST",
        params,
      };
      return this._makeRequest(config, $);
    },
    /**
     * Adds an existing label to the specified card.
     *
     * @param {string}  idCard the ID of the Card to move.
     * @param {string}  params.value the ID of the Label that will be added to the Card.
     * @returns {array} an string array with the ID of all the Card's Labels.
     * See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-idlabels-post
     */
    async addExistingLabelToCard(idCard, params, $) {
      const config = {
        url: `${this._getBaseUrl()}/cards/${idCard}/idLabels`,
        method: "POST",
        params,
      };
      return this._makeRequest(config, $);
    },
    /**
     * Adds an existing label to the specified card.
     *
     * @param {string}  idCard the ID of the Card to move.
     * @param {string}  params.value the ID of the Label that will be added to the Card.
     * @returns {array} an string array with the ID of all the Card's Labels.
     * See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-idlabels-post
     */
    async addMemberToCard(idCard, params, $) {
      const config = {
        url: `${this._getBaseUrl()}/cards/${idCard}/idMembers`,
        method: "POST",
        params,
      };
      return this._makeRequest(config, $);
    },
    /**
     * Creates a checklist on the specified card.
     *
     * @param {string}  params.idCard the ID of the Card that the checklist should be
     * greated on.
     * @param {string}  params.name name for the checklist to create.
     * @param {string}  params.pos the position of the new checklist.
     * @param {string}  params.idChecklistSource ID of a checklist to copy into the new checklist.
     * @returns an object with the created checklist.
     * See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-checklists-post
     */
    async createChecklist(params, $) {
      const config = {
        url: `${this._getBaseUrl()}checklists`,
        method: "POST",
        params,
      };
      return this._makeRequest(config, $);
    },
    /**
     * Creates a comment on a card.
     *
     * @param {string}  idCard the ID of the Card that the comment should be created on.
     * @param {string}  params.text the text for the comment.
     * @returns a object containing a summary of the related card, members, and other Trello
     * entities related to the newly created comment.
     * See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-actions-comments-post
     */
    async createCommentOnCard(idCard, comment, $) {
      const config = {
        url: `${this._getBaseUrl()}cards/${idCard}/actions/comments`,
        method: "POST",
        params: {
          text: comment,
        },
      };
      return this._makeRequest(config, $);
    },
    /**
     * Closes a board.
     *
     * @param {string}  opts.boardId the ID of the Board to close.
     * @returns the updated board object with the `closed` property set to true.
     * See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-put
     */
    async closeBoard(boardId, $) {
      const config = {
        url: `${this._getBaseUrl()}/boards/${boardId}`,
        method: "PUT",
        data: {
          closed: true,
        },
      };
      return this._makeRequest(config, $);
    },
    /**
     * Creates a new card.
     *
     * @param {string}  opts.name the name of the card.
     * @param {string}  opts.desc the description for the card.
     * @param {string}  opts.pos the position of the new card.
     * @param {string}  opts.due the due date for the card.
     * @param {boolean}  opts.dueComplete flag that indicates if `dueDate` expired.
     * @param {string}  opts.idList the ID of the list the card should be created in.
     * @param {array}  opts.idMembers array of member IDs to add to the card.
     * @param {array}  opts.idLabels array of label IDs to add to the card.
     * @param {string}  opts.urlSource a URL starting with `http://` or `https://`."
     * @param {string}  opts.fileSource format: `binary`.
     * @param {string}  opts.mimeType the mimeType of the attachment. Max length 256.
     * @param {string}  opts.idCardSource the ID of a card to copy into the new card.
     * @param {string}  opts.keepFromSource if using `idCardSource`, specifies properties to copy.
     * @returns the created card object. See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-post
     */
    async createCard(opts, $) {
      const config = {
        url: `${this._getBaseUrl()}/cards`,
        method: "post",
        data: opts,
      };
      return this._makeRequest(config, $);
    },
    /**
     * Deletes the specified checklist.
     *
     * @param {string}  idChecklist the ID of the checklist to delete.
     * @returns {object} an empty `limits` object indicating the operation completed successfully.
     */
    async deleteChecklist(idChecklist, $) {
      const config = {
        url: `${this._getBaseUrl()}checklists/${idChecklist}`,
        method: "DELETE",
      };
      return this._makeRequest(config, $);
    },
    /**
     * Finds a label on a specific board.
     *
     * @param {string}  boardId unique identifier of the board to search for labels.
     * @param {string}  params.limit the number of labels to be returned.
     * @returns {array} an array with label objects complying with the specified parameters.
     */
    async findLabel(boardId, params, $) {
      const config = {
        url: `${this._getBaseUrl()}/boards/${boardId}/labels`,
        params,
      };
      return this._makeRequest(config, $);
    },
    /**
     * Finds a list in the specified board.
     *
     * @param {string}  boardId unique identifier of the board to search for lists.
     * @param {string}  params.cards filter to apply to cards. valid values: `all`, `closed`,
     * `none`, `open`.
     * @param {string}  params.card_fields `all` or a comma-separated list of card [fields](https://developer.atlassian.com/cloud/trello/guides/rest-api/object-definitions/#card-object).`,
     * `none`, `open`.
     * @param {string}  params.filter filter to apply to lists. valid values: `all`, `closed`,
     * `none`, `open`.
     * @returns {array} an array with list objects conforming with the specified parameters.
     */
    async findList(boardId, params, $) {
      const config = {
        url: `${this._getBaseUrl()}/boards/${boardId}/lists`,
        params,
      };
      return this._makeRequest(config, $);
    },
    async getResource(endpoint, params = null) {
      const config = {
        url: `${this._getBaseUrl()}${endpoint}`,
        params,
      };
      return this._makeRequest(config);
    },
    /**
     * Moves a card to the specified board/list pair.
     *
     * @param {string}  idCard the ID of the Card to move.
     * @param {string}  data.idBoard the ID of the board the card should be moved to.
     * @param {string}  data.idList the ID of the list that the card should be moved to.
     * @returns an updated card object set to the specified board and list ids.
     * See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-put
     */
    async moveCardToList(idCard,
      data, $) {
      const config = {
        url: `${this._getBaseUrl()}/cards/${idCard}`,
        method: "PUT",
        data,
      };
      return this._makeRequest(config, $);
    },
    async verifyTrelloWebhookRequest(request, callbackURL) {
      let secret = this.$auth.oauth_refresh_token;
      const base64Digest = function (s) {
        return crypto.createHmac("sha1", secret).update(s)
          .digest("base64");
      };
      const content = JSON.stringify(request.body) + callbackURL;
      const doubleHash = base64Digest(content);
      const headerHash = request.headers["x-trello-webhook"];
      return doubleHash === headerHash;
    },
    async getBoard(id) {
      return this.getResource(`boards/${id}`);
    },
    async getBoards(id) {
      return this.getResource(`members/${id}/boards`);
    },
    /**
     * Gets details of a card.
     *
     * @param {string} id the ID of the card to get details of.
     * @returns  {object} a card object. See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-post
     */
    async getCard(id) {
      return this.getResource(`cards/${id}`);
    },
    async getCards(id) {
      return this.getResource(`boards/${id}/cards`);
    },
    async getChecklist(id) {
      return this.getResource(`checklists/${id}`);
    },
    async getLabel(id) {
      return this.getResource(`labels/${id}`);
    },
    async getList(id) {
      return this.getResource(`lists/${id}`);
    },
    async getLists(id) {
      return this.getResource(`boards/${id}/lists`);
    },
    async getNotifications(id, params) {
      return this.getResource(`members/${id}/notifications`, params);
    },
    async getMember(id) {
      return this.getResource(`members/${id}`);
    },
    async getAttachment(cardId, attachmentId) {
      return this.getResource(
        `cards/${cardId}/attachments/${attachmentId}`,
      );
    },
    async getCardList(cardId) {
      return this.getResource(`cards/${cardId}/list`);
    },
    async createHook({
      id, endpoint,
    }) {
      const resp = await this._makeRequest({
        method: "post",
        url: `${this._getBaseUrl()}webhooks/`,
        headers: {
          "Content-Type": "applicaton/json",
        },
        params: {
          idModel: id,
          description: "Pipedream Source ID", //todo add ID
          callbackURL: endpoint,
        },
      });
      return resp;
    },
    async deleteHook({ hookId }) {
      return this._makeRequest({
        method: "delete",
        url: `${this._getBaseUrl()}webhooks/${hookId}`,
      });
    },
    /**
     * Removes an existing label from the specified card.
     *
     * @param {string}  idCard the ID of the Card to remove the Label from.
     * @param {string}  idLabel the ID of the Label to be removed from the card.
     * @returns {object} an object with the null valued property `_value` indicating that
     * there were no errors
     */
    async removeLabelFromCard(idCard, idLabel, $) {
      const config = {
        url: `${this._getBaseUrl()}/cards/${idCard}/idLabels/${idLabel}`,
        method: "DELETE",
      };
      return this._makeRequest(config, $);
    },
    /**
     * Renames the specified list
     *
     * @param {string}  listId the ID of the List to rename.
     * @param {string}  opts.name the new name of the list.
     * @returns {object} a list object with the `closed` property, indicated if the list is
     * closed or archived, `id` the id of the renamed List, `idBoard` the id of the Board parent
     * to the List, `name` with the new name of the List, and `pos` with the position of the List
     * in the Board.
     */
    async renameList(listId, data, $) {
      const config = {
        url: `${this._getBaseUrl()}/lists/${listId}`,
        method: "PUT",
        data,
      };
      return this._makeRequest(config, $);
    },
    /**
     * Searches for members, cards, boards, and/or organizations matching the specified query.
     *
     * @param {string}  params.query the search query with a length of 1 to 16384 characters.
     * @param {string}  params.idBoards the special value `mine` or a comma-separated list of Board
     *  IDs where cards will be searched in.
     * @param {string}  params.idOrganizations an string array of Organizations IDs where cards will
     * be searched in.
     * @param {boolean}  params.idCards an string array of Cards IDs. search will be done on
     * these cards.
     * @param {string}  params.cardFields `all` or a comma separated list of card fields to return
     * in each card object.`
     * @param {array}  params.cardsLimit the maximum number of cards to return.
     * @param {array}  params.cardsPage the page of results for cards.
     * @param {string}  params.cardBoard flag for including of parent board with card results.
     * @param {string}  params.cardList flag for including the parent list with card results.
     * @param {string}  params.cardMembers flag for including member objects with card results.
     * @param {string}  params.cardStickers flag for including sticker objects with card results.
     * @param {string}  params.cardAttachments flag for including attachment objects with card
     * results. a boolean value (`true` or `false`) or `cover` for only card cover attachment.
     * @param {string}  params.partial specifying partial to be true means that Trello will search
     * for content that starts with any of the words in `query`. when searching for a card titled
     * \"My Development Status Report\", by default a solution is to search for "Development". If
     * partial is enabled, searching for \"dev\" is possible, however a search for \"velopment\"
     * is not possible.
     * @returns {cards: array, options: object} an array with the `cards` objects matching the
     * specified `query`, and an object with the `options` for the search, such as `modelTypes` (in
     * this case "cards"), `partial` the search `terms` as included in `query`, and other
     * `modifiers`.
     */
    async search(params, $) {
      const config = {
        url: `${this._getBaseUrl()}search`,
        params,
      };
      return this._makeRequest(config, $);
    },
    /**
     * Searches for boards matching the specified query.
     *
     * @param {string}  params.query the search query with a length of 1 to 16384 characters.
     * @param {string}  params.idBoards the special value `mine` or a comma-separated list of Board
     *  IDs where cards will be searched in.
     * @param {string}  params.idOrganizations an string array of Organizations IDs where cards will
     * be searched in.
     * @param {boolean}  params.idCards an string array of Cards IDs. search will be done on
     * these cards.
     * @param {string}  params.cardFields `all` or a comma separated list of card fields to return
     * in each card object.`
     * @param {array}  params.cardsLimit the maximum number of cards to return.
     * @param {array}  params.cardsPage the page of results for cards.
     * @param {string}  params.cardBoard flag for including of parent board with card results.
     * @param {string}  params.cardList flag for including the parent list with card results.
     * @param {string}  params.cardMembers flag for including member objects with card results.
     * @param {string}  params.cardStickers flag for including sticker objects with card results.
     * @param {string}  params.cardAttachments flag for including attachment objects with card
     * results. a boolean value (`true` or `false`) or `cover` for only card cover attachment.
     * @param {string}  params.partial specifying partial to be true means that Trello will search
     * for content that starts with any of the words in `query`. when searching for a card titled
     * \"My Development Status Report\", by default a solution is to search for "Development". If
     * partial is enabled, searching for \"dev\" is possible, however a search for \"velopment\"
     * is not possible.
     * @returns {cards: array, options: object} an array with the `cards` objects matching the
     * specified `query`, and an object with the `options` for the search, such as `modelTypes` (in
     * this case "cards"), `partial` the search `terms` as included in `query`, and other
     * `modifiers`.
     */
    async searchBoards(opts, $) {
      const params = {
        ...opts,
        idOrganizations: opts.idOrganizations ?
          opts.idOrganizations.join(",") :
          undefined,
      };
      return this.search(params, $);
    },
    /**
     * Searches for cards matching the specified query.
     *
     * @param {string}  params.query the search query with a length of 1 to 16384 characters.
     * @param {string}  params.idBoards the special value `mine` or a comma-separated list of Board
     *  IDs where cards will be searched in.
     * @param {string}  params.idOrganizations an string array of Organizations IDs where cards will
     * be searched in.
     * @param {boolean}  params.idCards an string array of Cards IDs. search will be done on
     * these cards.
     * @param {string}  params.cardFields `all` or a comma separated list of card fields to return
     * in each card object.`
     * @param {array}  params.cardsLimit the maximum number of cards to return.
     * @param {array}  params.cardsPage the page of results for cards.
     * @param {string}  params.cardBoard flag for including of parent board with card results.
     * @param {string}  params.cardList flag for including the parent list with card results.
     * @param {string}  params.cardMembers flag for including member objects with card results.
     * @param {string}  params.cardStickers flag for including sticker objects with card results.
     * @param {string}  params.cardAttachments flag for including attachment objects with card
     * results. a boolean value (`true` or `false`) or `cover` for only card cover attachment.
     * @param {string}  params.partial specifying partial to be true means that Trello will search
     * for content that starts with any of the words in `query`. when searching for a card titled
     * \"My Development Status Report\", by default a solution is to search for "Development". If
     * partial is enabled, searching for \"dev\" is possible, however a search for \"velopment\"
     * is not possible.
     * @returns {cards: array, options: object} an array with the `cards` objects matching the
     * specified `query`, and an object with the `options` for the search, such as `modelTypes` (in
     * this case "cards"), `partial` the search `terms` as included in `query`, and other
     * `modifiers`.
     */
    async searchCards(opts, $) {
      const params = {
        ...opts,
        idOrganizations: opts.idOrganizations ?
          opts.idOrganizations.join(",") :
          undefined,
        idCards: opts.idCards ?
          opts.idCards.join(",") :
          undefined,
      };
      return this.search(params, $);
    },
    /**
     * Updates a card.
     *
     * @param {string}  params.name the name of the card.
     * @param {string}  params.desc the description for the card.
     * @param {string}  params.pos the position of the new card.
     * @param {string}  params.due the due date for the card.
     * @param {boolean}  params.dueComplete flag that indicates if `dueDate` expired.
     * @param {string}  params.idList the ID of the list the card should be created in.
     * @param {array}  params.idMembers array of member IDs to add to the card.
     * @param {array}  params.idLabels array of label IDs to add to the card.
     * @param {string}  params.urlSource a URL starting with `http://` or `https://`."
     * @param {string}  params.fileSource format: `binary`.
     * @param {string}  params.mimeType the mimeType of the attachment. Max length 256.
     * @param {string}  params.idCardSource the ID of a card to copy into the new card.
     * @param {string}  params.keepFromSource if using `idCardSource`, specifies properties to
     * @returns the updated card object. See more at the API docs:
     * https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-post
     */
    async updateCard(idCard,
      params, $) {
      const config = {
        url: `${this._getBaseUrl()}cards/${idCard}`,
        method: "PUT",
        params,
      };
      return this._makeRequest(config, $);
    },
    getFilterOptions() {
      return [
        "all",
        "closed",
        "none",
        "open",
      ];
    },
    async listMembers(board) {
      const config = {
        url: `${this._getBaseUrl()}boards/${board}/members`,
        method: "GET",
      };
      return this._makeRequest(config);
    },
    async listBoardChecklists(board) {
      const config = {
        url: `${this._getBaseUrl()}boards/${board}/checklists`,
        method: "GET",
      };
      return this._makeRequest(config);
    },
    async listCardChecklists(card) {
      const config = {
        url: `${this._getBaseUrl()}cards/${card}/checklists`,
        method: "GET",
      };
      return this._makeRequest(config);
    },
  },
};
