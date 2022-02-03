import { BaseNode } from '@voiceflow/base-types';
import { transformStringVariableToNumber } from '@voiceflow/common';

// integrations repos endpoints based on action
export const ENDPOINTS_MAP: Record<string, Record<string, string>> = {
  [BaseNode.Utils.IntegrationType.GOOGLE_SHEETS]: {
    [BaseNode.GoogleSheets.GoogleSheetsActionType.RETRIEVE_DATA]: '/google_sheets/retrieve_data',
    [BaseNode.GoogleSheets.GoogleSheetsActionType.CREATE_DATA]: '/google_sheets/create_data',
    [BaseNode.GoogleSheets.GoogleSheetsActionType.UPDATE_DATA]: '/google_sheets/update_data',
    [BaseNode.GoogleSheets.GoogleSheetsActionType.DELETE_DATA]: '/google_sheets/delete_data',
  },
  [BaseNode.Utils.IntegrationType.ZAPIER]: {
    [BaseNode.Zapier.ZapierActionType.START_A_ZAP]: '/zapier/trigger',
  },
};

export const resultMappings = (node: BaseNode.Integration.Node, resultData: any): Record<string, string | number | null> => {
  switch (node.selected_integration) {
    case BaseNode.Utils.IntegrationType.GOOGLE_SHEETS: {
      const newVariables: Record<string, string | number | null> = {};

      if (node.action_data && node.action_data.mapping) {
        node.action_data.mapping.forEach((m) => {
          const col = m.arg1;
          const toVar = m.arg2;

          // FIXME: possible bug, col is number based on the general types
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const isRowNumber = col === 'row_number';

          newVariables[toVar] = transformStringVariableToNumber(isRowNumber ? resultData._cell_location.row : resultData[col]);
        });
      }
      return newVariables;
    }
    case BaseNode.Utils.IntegrationType.CUSTOM_API: {
      return resultData;
    }
    case BaseNode.Utils.IntegrationType.ZAPIER:
    default: {
      return {};
    }
  }
};
