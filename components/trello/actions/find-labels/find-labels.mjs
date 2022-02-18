import validate from "validate.js";
import common from "../common.js";

export default {
  ...common,
  key: "trello-find-labels",
  name: "Find a Label",
  description: "Finds a label on a specific board by name.",
  version: "0.1.2",
  type: "action",
  props: {
    ...common.props,
    board: {
      propDefinition: [
        common.props.trello,
        "board",
      ],
      description: "Unique identifier of the board to search for labels",
    },
    name: {
      type: "string",
      label: "Label Name",
      description: "Name of the label to find.",
    },
    labelLimit: {
      type: "integer",
      label: "Label Limit",
      description: "The number of labels to be returned.",
      default: 50,
    },
  },
  async run({ $ }) {
    const constraints = {
      board: {
        presence: true,
        format: {
          pattern: "^[0-9a-fA-F]{24}$",
          message: function (value) {
            return validate.format("^%{id} is not a valid Board id", {
              id: value,
            });
          },
        },
      },
      name: {
        presence: true,
      },
      labelLimit: {
        type: "integer",
        numericality: {
          greaterThanOrEqualTo: 0,
          lessThanOrEqualTo: 1000,
          message: "must be a positive integer greater than or equal to 0, and less than or equal to 1000.",
        },
      },
    };
    const validationResult = validate({
      board: this.board,
      name: this.name,
      labelLimit: this.labelLimit,
    }, constraints);
    this.checkValidationResults(validationResult);
    const opts = {
      limit: this.labelLimit,
    };
    const labels = await this.trello.findLabel(this.board, opts, $);
    const res = this.getMatches(labels, this.name);
    $.export("$summary", `Successfully retrieved labels with name ${this.name}`);
    return res;
  },
};
