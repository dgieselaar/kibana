/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { FeatureCollection } from 'geojson';
import _ from 'lodash';
import React, { Component } from 'react';
import type { FileUploadGeoResults } from '../../../../../file_upload/public/lazy_load_bundle';
import { DEFAULT_MAX_RESULT_WINDOW, SCALING_TYPES } from '../../../../common/constants';
import { getFileUploadComponent } from '../../../kibana_services';
import { createDefaultLayerDescriptor } from '../../sources/es_search_source/es_documents_layer_wizard';
import { GeoJsonFileSource } from '../../sources/geojson_file_source/geojson_file_source';
import type { RenderWizardArguments } from '../layer_wizard_registry';
import { VectorLayer } from '../vector_layer/vector_layer';

export enum UPLOAD_STEPS {
  CONFIGURE_UPLOAD = 'CONFIGURE_UPLOAD',
  UPLOAD = 'UPLOAD',
  ADD_DOCUMENT_LAYER = 'ADD_DOCUMENT_LAYER',
}

enum INDEXING_STAGE {
  CONFIGURE = 'CONFIGURE',
  TRIGGERED = 'TRIGGERED',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

interface State {
  indexingStage: INDEXING_STAGE;
  results?: FileUploadGeoResults;
}

export class ClientFileCreateSourceEditor extends Component<RenderWizardArguments, State> {
  private _isMounted: boolean = false;

  state: State = {
    indexingStage: INDEXING_STAGE.CONFIGURE,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (
      this.props.currentStepId === UPLOAD_STEPS.UPLOAD &&
      this.state.indexingStage === INDEXING_STAGE.CONFIGURE
    ) {
      this.setState({ indexingStage: INDEXING_STAGE.TRIGGERED });
      this.props.startStepLoading();
      return;
    }

    if (
      this.props.isOnFinalStep &&
      this.state.indexingStage === INDEXING_STAGE.SUCCESS &&
      this.state.results
    ) {
      this._addDocumentLayer(this.state.results);
    }
  }

  _addDocumentLayer = _.once((results: FileUploadGeoResults) => {
    const esSearchSourceConfig = {
      indexPatternId: results.indexPatternId,
      geoField: results.geoFieldName,
      // Only turn on bounds filter for large doc counts
      filterByMapBounds: results.docCount > DEFAULT_MAX_RESULT_WINDOW,
      scalingType:
        results.geoFieldType === ES_FIELD_TYPES.GEO_POINT
          ? SCALING_TYPES.CLUSTERS
          : SCALING_TYPES.LIMIT,
    };
    this.props.previewLayers([
      createDefaultLayerDescriptor(esSearchSourceConfig, this.props.mapColors),
    ]);
    this.props.advanceToNextStep();
  });

  _onFileSelect = (geojsonFile: FeatureCollection, name: string, previewCoverage: number) => {
    if (!this._isMounted) {
      return;
    }

    if (!geojsonFile) {
      this.props.previewLayers([]);
      return;
    }

    const areResultsTrimmed = previewCoverage < 100;
    const sourceDescriptor = GeoJsonFileSource.createDescriptor({
      __featureCollection: geojsonFile,
      areResultsTrimmed,
      tooltipContent: areResultsTrimmed
        ? i18n.translate('xpack.maps.fileUpload.trimmedResultsMsg', {
            defaultMessage: `Results limited to {numFeatures} features, {previewCoverage}% of file.`,
            values: {
              numFeatures: geojsonFile.features.length.toLocaleString(),
              previewCoverage,
            },
          })
        : null,
      name,
    });
    const layerDescriptor = VectorLayer.createDescriptor(
      { sourceDescriptor },
      this.props.mapColors
    );
    this.props.previewLayers([layerDescriptor]);
  };

  _onFileClear = () => {
    this.props.previewLayers([]);
  };

  _onUploadComplete = (results: FileUploadGeoResults) => {
    if (!this._isMounted) {
      return;
    }

    this.setState({ results });
    this.setState({ indexingStage: INDEXING_STAGE.SUCCESS });
    this.props.advanceToNextStep();
    this.props.enableNextBtn();
  };

  _onUploadError = () => {
    if (!this._isMounted) {
      return;
    }

    this.props.stopStepLoading();
    this.props.disableNextBtn();

    this.setState({ indexingStage: INDEXING_STAGE.ERROR });
  };

  render() {
    const FileUpload = getFileUploadComponent();

    return (
      <EuiPanel>
        <FileUpload
          isIndexingTriggered={this.state.indexingStage === INDEXING_STAGE.TRIGGERED}
          onFileSelect={this._onFileSelect}
          onFileClear={this._onFileClear}
          enableImportBtn={this.props.enableNextBtn}
          disableImportBtn={this.props.disableNextBtn}
          onUploadComplete={this._onUploadComplete}
          onUploadError={this._onUploadError}
        />
      </EuiPanel>
    );
  }
}
