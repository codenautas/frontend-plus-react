import React from 'react';

import SuccessDisplay from './SuccessDisplay';

export interface ResultOkProps { 
    data: any; }

type ResultComponentMap = {
    [key: string]: React.FC<ResultOkProps>; 
};

export let resultsOk: ResultComponentMap = {
    'successful_operation': SuccessDisplay as React.FC<ResultOkProps>,
};

export const extendResultsOk = (newComponents: ResultComponentMap) => {
    resultsOk = { ...resultsOk, ...newComponents };
};