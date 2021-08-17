import { Node } from '@voiceflow/base-types';
import { transformStringVariableToNumber } from '@voiceflow/common';

// integrations repos endpoints based on action
export const ENDPOINTS_MAP: Record<string, Record<string, string>> = {
  [Node.Utils.IntegrationType.GOOGLE_SHEETS]: {
    [Node.GoogleSheets.GoogleSheetsActionType.RETRIEVE_DATA]: '/google_sheets/retrieve_data',
    [Node.GoogleSheets.GoogleSheetsActionType.CREATE_DATA]: '/google_sheets/create_data',
    [Node.GoogleSheets.GoogleSheetsActionType.UPDATE_DATA]: '/google_sheets/update_data',
    [Node.GoogleSheets.GoogleSheetsActionType.DELETE_DATA]: '/google_sheets/delete_data',
  },
  [Node.Utils.IntegrationType.ZAPIER]: {
    [Node.Zapier.ZapierActionType.START_A_ZAP]: '/zapier/trigger',
  },
};

export const resultMappings = (node: Node.Integration.Node, resultData: any): Record<string, string | number | null> => {
  switch (node.selected_integration) {
    case Node.Utils.IntegrationType.GOOGLE_SHEETS: {
      const newVariables: Record<string, string | number | null> = {};

      if (node.action_data && node.action_data.mapping) {
        node.action_data.mapping.forEach((m) => {
          const col = m.arg1;
          const toVar = m.arg2;

          // FIXME: possible bug, col is number based on the general types
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          const isRowNumber = col === 'row_number';

          newVariables[toVar] = transformStringVariableToNumber(isRowNumber ? resultData._cell_location.row : resultData[col]);
        });
      }
      return newVariables;
    }
    case Node.Utils.IntegrationType.CUSTOM_API: {
      return resultData;
    }
    case Node.Utils.IntegrationType.ZAPIER:
    default: {
      return {};
    }
  }
};
