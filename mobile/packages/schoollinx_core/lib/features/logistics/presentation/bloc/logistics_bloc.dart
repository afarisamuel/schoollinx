import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/bus_route_entity.dart';
import '../../domain/usecases/logistics_usecases.dart';

// EVENTS
abstract class LogisticsEvent extends Equatable {
  const LogisticsEvent();
  @override
  List<Object?> get props => [];
}

class LoadBusRoutesEvent extends LogisticsEvent {}

class SelectBusRouteEvent extends LogisticsEvent {
  final BusRouteEntity route;
  const SelectBusRouteEvent(this.route);
  @override
  List<Object?> get props => [route];
}

class FetchLiveBusLocationEvent extends LogisticsEvent {
  final String routeId;
  const FetchLiveBusLocationEvent(this.routeId);
  @override
  List<Object?> get props => [routeId];
}

class GenerateChildGatePassEvent extends LogisticsEvent {
  final String childId;
  const GenerateChildGatePassEvent(this.childId);
  @override
  List<Object?> get props => [childId];
}

class LoadFleetSummaryEvent extends LogisticsEvent {}

// STATES
abstract class LogisticsState extends Equatable {
  const LogisticsState();
  @override
  List<Object?> get props => [];
}

class LogisticsInitial extends LogisticsState {}
class LogisticsLoading extends LogisticsState {}

class LogisticsRoutesLoaded extends LogisticsState {
  final List<BusRouteEntity> routes;
  final BusRouteEntity? selectedRoute;
  final BusLocationEntity? liveLocation;
  final GatePassEntity? activeGatePass;
  final FleetSummaryEntity? fleetSummary;

  const LogisticsRoutesLoaded({
    required this.routes,
    this.selectedRoute,
    this.liveLocation,
    this.activeGatePass,
    this.fleetSummary,
  });

  LogisticsRoutesLoaded copyWith({
    List<BusRouteEntity>? routes,
    BusRouteEntity? selectedRoute,
    BusLocationEntity? liveLocation,
    GatePassEntity? activeGatePass,
    FleetSummaryEntity? fleetSummary,
  }) {
    return LogisticsRoutesLoaded(
      routes: routes ?? this.routes,
      selectedRoute: selectedRoute ?? this.selectedRoute,
      liveLocation: liveLocation ?? this.liveLocation,
      activeGatePass: activeGatePass ?? this.activeGatePass,
      fleetSummary: fleetSummary ?? this.fleetSummary,
    );
  }

  @override
  List<Object?> get props => [routes, selectedRoute, liveLocation, activeGatePass, fleetSummary];
}

class LogisticsError extends LogisticsState {
  final String message;
  const LogisticsError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class LogisticsBloc extends Bloc<LogisticsEvent, LogisticsState> {
  final GetBusRoutesUseCase getBusRoutesUseCase;
  final GetRouteLocationUseCase getRouteLocationUseCase;
  final GetGatePassUseCase getGatePassUseCase;
  final GetFleetSummaryUseCase getFleetSummaryUseCase;

  List<BusRouteEntity> _routes = [];
  BusRouteEntity? _selectedRoute;

  LogisticsBloc({
    required this.getBusRoutesUseCase,
    required this.getRouteLocationUseCase,
    required this.getGatePassUseCase,
    required this.getFleetSummaryUseCase,
  }) : super(LogisticsInitial()) {
    on<LoadBusRoutesEvent>((event, emit) async {
      emit(LogisticsLoading());
      final result = await getBusRoutesUseCase(NoParams());
      result.fold(
        (failure) => emit(LogisticsError(failure.message)),
        (routes) {
          _routes = routes;
          if (routes.isNotEmpty) {
            _selectedRoute = routes.first;
            add(FetchLiveBusLocationEvent(routes.first.id));
          } else {
            emit(const LogisticsRoutesLoaded(routes: []));
          }
        },
      );
    });

    on<SelectBusRouteEvent>((event, emit) {
      _selectedRoute = event.route;
      add(FetchLiveBusLocationEvent(event.route.id));
    });

    on<FetchLiveBusLocationEvent>((event, emit) async {
      final result = await getRouteLocationUseCase(event.routeId);
      result.fold(
        (failure) => emit(LogisticsError(failure.message)),
        (location) {
          emit(LogisticsRoutesLoaded(
            routes: _routes,
            selectedRoute: _selectedRoute,
            liveLocation: location,
          ));
        },
      );
    });

    on<GenerateChildGatePassEvent>((event, emit) async {
      emit(LogisticsLoading());
      final result = await getGatePassUseCase(event.childId);
      result.fold(
        (failure) => emit(LogisticsError(failure.message)),
        (pass) {
          emit(LogisticsRoutesLoaded(
            routes: _routes,
            selectedRoute: _selectedRoute,
            activeGatePass: pass,
          ));
        },
      );
    });

    on<LoadFleetSummaryEvent>((event, emit) async {
      emit(LogisticsLoading());
      final result = await getFleetSummaryUseCase(NoParams());
      result.fold(
        (failure) => emit(LogisticsError(failure.message)),
        (summary) {
          emit(LogisticsRoutesLoaded(
            routes: _routes,
            fleetSummary: summary,
          ));
        },
      );
    });
  }
}
